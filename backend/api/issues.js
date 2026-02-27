const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Issue = require('../src/models/Issue')
const Department = require('../src/models/Department')
const Category = require('../src/models/Category')
const User = require('../src/models/User')
const { upload } = require('../src/config/s3')
const openai = require('../src/config/openai')
const priorityOptions = require('../src/config/priority')
const ExcelJS = require('exceljs')
const { logIssueCreationOrganization, logIssueCreationPublic } = require('../src/utils/logger')
const { getGeneralLocationForSite } = require('../src/utils/locationHelper')

const router = express.Router()
const Site = require('../src/models/Site')

const endpoints = {
  open_ai_chat: 'https://api.openai.com/v1/chat/completions',
}

const gptGenericModel = 'gpt-4o-2024-08-06'

const sanitizeJsonContent = (content) => {
  if (!content) return null
  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('Failed to parse AI classification JSON:', error)
    return null
  }
}

// Helper function to check if user can accept/resolve an issue
const canUserAcceptOrResolveIssue = async (issue, user) => {
  // Admins and super admins can always accept/resolve
  if (user.role === 'saas-owner' || user.role === 'superadmin' || user.role === 'client') {
    return true
  }

  // Vendors can only accept/resolve issues assigned to them
  if (user.role === 'vendors') {
    if (issue.assignedTo) {
      const assignedToId = issue.assignedTo._id?.toString() || issue.assignedTo.toString()
      const userId = user.userId?.toString() || user.id?.toString()
      return assignedToId === userId
    }
    return false // Vendors can only work on explicitly assigned issues
  }

  // If issue is assigned to a specific user, only that user can accept/resolve
  if (issue.assignedTo) {
    const assignedToId = issue.assignedTo._id?.toString() || issue.assignedTo.toString()
    const userId = user.userId?.toString() || user.id?.toString()
    return assignedToId === userId
  }

  // If issue is assigned to a department (but no specific user), any user from that department can accept/resolve
  if (issue.department) {
    const departmentId = issue.department._id?.toString() || issue.department.toString()
    const userDepartmentIds = user.departmentIds || []
    return userDepartmentIds.some(
      (deptId) => deptId.toString() === departmentId
    )
  }

  // If no assignment, only the creator can accept/resolve (fallback)
  const issueUserId = issue.userId._id?.toString() || issue.userId.toString()
  const userId = user.userId?.toString() || user.id?.toString()
  return issueUserId === userId
}

// Helper to add an activity comment to an issue
const pushIssueComment = (issue, { type, message, userId = null, payload = null }) => {
  issue.comments = issue.comments || []
  issue.comments.push({
    type,
    message,
    userId: userId || undefined,
    createdAt: new Date(),
    ...(payload && Object.keys(payload).length > 0 ? { payload } : {}),
  })
}

// Get all issues for the authenticated user/client
router.get('/', protect, async (req, res) => {
  try {
    const query = { clientId: req.user?.clientId }
    
    // For SaaS owners, show all issues
    if (req.user?.role === 'saas-owner') {
      // No additional filtering
    }
    // Client admins and super admins see everything within their client
    else if (req.user?.role === 'client' || req.user?.role === 'superadmin') {
      // No additional filtering required
    }
    // Field staff only see tickets they raised
    else if (req.user?.role === 'field-staff') {
      query.userId = req.user?.userId
    }
    // Head of staff sees tickets across their departments
    else if (req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        query.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        return res.json([])
      }
    }
    // Vendors only see tickets assigned to them
    else if (req.user?.role === 'vendors') {
      query.assignedTo = req.user?.userId
    }
    // Tenants only see tickets they created (privacy-protected view)
    else if (req.user?.role === 'tenants') {
      query.userId = req.user?.userId
    }
    // Default fallback: only tickets created by the user
    else {
      query.userId = req.user?.userId
    }

    // Date filtering
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {}
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate)
      }
      if (req.query.endDate) {
        // Set end date to end of day
        const endDate = new Date(req.query.endDate)
        endDate.setHours(23, 59, 59, 999)
        query.createdAt.$lte = endDate
      }
    }

    const issues = await Issue.find(query)
      .populate('site', 'name')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })

    res.json(issues)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Download issues report as Excel (must be before /:id route)
router.get('/report/download', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' })
    }

    // Build query with same role-based filtering as GET /issues
    const query = { clientId: req.user?.clientId }
    
    // Apply role-based filtering
    if (req.user?.role === 'saas-owner') {
      // No additional filtering
    } else if (req.user?.role === 'client' || req.user?.role === 'superadmin') {
      // No additional filtering required
    } else if (req.user?.role === 'field-staff') {
      query.userId = req.user?.userId
    } else if (req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        query.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        return res.status(403).json({ message: 'No departments assigned' })
      }
    } else if (req.user?.role === 'vendors') {
      query.assignedTo = req.user?.userId
    } else if (req.user?.role === 'tenants') {
      query.userId = req.user?.userId
    } else {
      query.userId = req.user?.userId
    }

    // Date filtering
    query.createdAt = {}
    query.createdAt.$gte = new Date(startDate)
    const endDateObj = new Date(endDate)
    endDateObj.setHours(23, 59, 59, 999)
    query.createdAt.$lte = endDateObj

    // Fetch issues with all populated fields
    const issues = await Issue.find(query)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('locationId', 'name')
      .sort({ createdAt: -1 })
      .lean()

    console.log(`Generating report for ${issues.length} issues from ${startDate} to ${endDate}`)

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Issues Report')

    // Define columns
    worksheet.columns = [
      { header: 'Issue ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Site', key: 'site', width: 25 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Created By', key: 'createdBy', width: 25 },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Created Date', key: 'createdDate', width: 20 },
      { header: 'Updated Date', key: 'updatedDate', width: 20 },
      { header: 'Due Date', key: 'dueDate', width: 20 },
      { header: 'Resolution Date', key: 'resolutionDate', width: 20 },
      { header: 'Resolution Description', key: 'resolutionDescription', width: 40 },
      { header: 'Image URLs', key: 'images', width: 50 },
    ]

    // Style header row (row 1 is automatically created by columns definition)
    try {
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    } catch (styleError) {
      console.error('Error styling header row:', styleError)
      // Continue even if styling fails
    }

    // Add data rows (even if empty, the file will have headers)
    issues.forEach((issue) => {
      const siteName = typeof issue.site === 'object' && issue.site ? issue.site.name : (issue.site || 'N/A')
      const siteCode = typeof issue.site === 'object' && issue.site ? issue.site.code : ''
      const categoryName = typeof issue.category === 'object' && issue.category ? issue.category.name : (issue.category || 'Not assigned')
      const departmentName = typeof issue.department === 'object' && issue.department ? issue.department.name : (issue.department || 'Not assigned')
      const locationName = typeof issue.locationId === 'object' && issue.locationId ? issue.locationId.name : 'N/A'
      const createdByName = typeof issue.userId === 'object' && issue.userId ? `${issue.userId.name} (${issue.userId.email})` : 'N/A'
      const assignedToName = typeof issue.assignedTo === 'object' && issue.assignedTo ? `${issue.assignedTo.name} (${issue.assignedTo.email})` : 'Not assigned'
      
      worksheet.addRow({
        id: issue._id.toString(),
        title: issue.title || 'N/A',
        description: issue.description || 'N/A',
        status: issue.status || 'N/A',
        priority: issue.priority || 'N/A',
        category: categoryName,
        department: departmentName,
        site: siteCode ? `${siteName} (${siteCode})` : siteName,
        location: locationName,
        createdBy: createdByName,
        assignedTo: assignedToName,
        createdDate: issue.createdAt ? new Date(issue.createdAt).toLocaleString() : 'N/A',
        updatedDate: issue.updatedAt ? new Date(issue.updatedAt).toLocaleString() : 'N/A',
        dueDate: issue.dueDate ? new Date(issue.dueDate).toLocaleString() : 'Not set',
        resolutionDate: issue.resolutionTime ? new Date(issue.resolutionTime).toLocaleString() : 'N/A',
        resolutionDescription: issue.resolutionDescription || 'N/A',
        images: Array.isArray(issue.images) ? issue.images.join('; ') : 'N/A',
      })
    })

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.width) {
        column.width = column.width
      }
    })

    // Set response headers before writing
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=issues-report-${startDate}-to-${endDate}.xlsx`
    )

    // Write to response stream
    try {
      await workbook.xlsx.write(res)
      res.end()
    } catch (writeError) {
      console.error('Error writing Excel file:', writeError)
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Failed to generate Excel file',
          error: process.env.NODE_ENV === 'development' ? writeError.message : undefined
        })
      } else {
        res.end()
      }
    }
  } catch (error) {
    console.error('Report generation error:', error)
    console.error('Error stack:', error.stack)
    // Only send JSON error if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        message: error.message || 'Failed to generate report',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    } else {
      // If headers were sent, we can't send JSON, just end the response
      res.end()
    }
  }
})

// Get single issue
router.get('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.userId', 'name email')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    res.json(issue)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create issue
router.post(
  '/',
  protect,
  upload.single('image'),
  [
    body('description').optional().trim(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    body('siteId').notEmpty().withMessage('Site is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { title, description, priority = 'medium', siteId, category, department, assignedTo, dueDate, locationId, latitude, longitude, platform = 'web' } = req.body
      const site = siteId || req.body.site

      if (!site) {
        return res.status(400).json({ message: 'Site is required' })
      }

      // Validate GPS coordinates are required
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          message: 'GPS location is required. Please enable location services and try again.',
          code: 'GPS_REQUIRED'
        })
      }

      // Validate GPS coordinates are valid numbers
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ 
          message: 'Invalid GPS coordinates. Please try capturing location again.',
          code: 'INVALID_GPS'
        })
      }

      // Validate GPS coordinates are within valid ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ 
          message: 'GPS coordinates are out of valid range.',
          code: 'INVALID_GPS_RANGE'
        })
      }

      // If locationId is not provided, find and assign the General location for the site
      let finalLocationId = locationId
      if (!finalLocationId) {
        const Location = require('../src/models/Location')
        const generalLocation = await getGeneralLocationForSite(site, req.user?.clientId)
        if (generalLocation) {
          finalLocationId = generalLocation._id
          console.log(`Assigned General location (${generalLocation.name}) to issue for site: ${site}`)
        } else {
          console.warn(`General location not found for site: ${site}. Issue will be created without location.`)
        }
      }

      // Validate: Either description OR image must be provided
      const hasDescription = description?.trim()
      const hasImage = req.file?.location
      
      if (!hasDescription && !hasImage) {
        return res.status(400).json({ 
          message: 'Either a description or an image is required to create an issue.',
          code: 'MISSING_DESCRIPTION_AND_IMAGE'
        })
      }

      // Validate dueDate if provided
      if (dueDate) {
        const due = new Date(dueDate)
        if (isNaN(due.getTime())) {
          return res.status(400).json({ message: 'Invalid due date format' })
        }
        if (due < new Date()) {
          return res.status(400).json({ message: 'Due date cannot be in the past' })
        }
      }

      // Validate assignedTo if provided
      if (assignedTo) {
        const assignedUser = await User.findOne({
          _id: assignedTo,
          clientId: req.user?.clientId,
        })
        if (!assignedUser) {
          return res.status(400).json({ message: 'Assigned user not found or does not belong to your client' })
        }
      }

      const departments = await Department.find({ clientId: req.user?.clientId })
      const categories = await Category.find({ clientId: req.user?.clientId })
      const priorities = Array.isArray(priorityOptions) ? priorityOptions : ['low', 'medium', 'high', 'critical']

      let aiDetails = {}
      try {
        // Calculate image hash to detect same image even with different URLs
        let imageHash = null
        if (req.file?.location) {
          imageHash = await openai.calculateImageHash(req.file.location)
        }
        
        aiDetails = await openai.getIssueDetails(
          description,
          site,
          req.file?.location,
          departments,
          categories,
          priorities,
          req.user?.userId || null,
          req.user?.clientId || null,
          null, // publicIdentifier not needed for authenticated web users
          imageHash // Pass the calculated hash
        )
      } catch (aiError) {
        console.error('Failed to fetch AI issue details:', aiError)
        // Log AI errors to database
        try {
          const { logError } = require('../src/utils/logger')
          await logError(aiError, {
            userId: req.user?.userId,
            clientId: req.user?.clientId,
            metadata: {
              endpoint: 'POST /api/issues',
              method: 'create-issue-organization',
              errorType: 'AI_ERROR',
              siteId: site?.toString(),
            },
          })
        } catch (logErr) {
          console.error('Failed to log AI error:', logErr)
        }
      }

      // Check if AI requires user input (description or new image)
      if (aiDetails.requiresUserInput === true) {
        const hasDescription = description?.trim()
        const hasImage = req.file?.location
        
        // Check if this is a repeated submission (3+ times) - applies to all REQUIRES_USER_INPUT cases
        if (aiDetails.repeatedSubmission === true && hasImage && !hasDescription) {
          return res.status(400).json({
            message: 'This image has been submitted multiple times without additional details. Please provide a description or submit a different image.',
            code: 'REQUIRES_USER_INPUT_REPEATED',
            reason: aiDetails.reason || 'Image has been submitted too many times without details',
            submissionCount: aiDetails.submissionCount || 3
          })
        }
        
        // If image is available but unclear, return specific error
        if (aiDetails.imageUnclear === true && hasImage) {
          return res.status(400).json({
            message: 'The provided image is unclear, blurry, or cannot be analyzed. Please provide a clearer image or add a description.',
            code: 'IMAGE_UNCLEAR',
            reason: aiDetails.reason || 'Image is not clear enough for AI analysis'
          })
        }
        
        if (!hasDescription && !hasImage) {
          return res.status(400).json({
            message: 'Please provide a description or upload an image to help AI understand the issue.',
            code: 'REQUIRES_USER_INPUT'
          })
        }
        
        if (!hasDescription && hasImage) {
          return res.status(400).json({
            message: 'AI could not process the image. Please provide a description to help AI understand the issue better.',
            code: 'REQUIRES_USER_INPUT',
            reason: aiDetails.reason || 'AI needs more context'
          })
        }
        
        if (hasDescription && !hasImage) {
          return res.status(400).json({
            message: 'AI needs more information. Please upload an image or provide a more detailed description.',
            code: 'REQUIRES_USER_INPUT',
            reason: aiDetails.reason || 'AI needs more context'
          })
        }
      }

      const images = req.file?.location ? [req.file.location] : []

      const aiTitle = typeof aiDetails.title === 'string' ? aiDetails.title.trim() : ''
      const fallbackTitle =
        title?.trim() ||
        aiTitle ||
        (description?.length > 80 ? `${description.slice(0, 77)}...` : description)

      const aiPriority = priorities.includes(aiDetails.priority) ? aiDetails.priority : null

      let departmentId = department
      if (!departmentId && aiDetails.assignedDepartment) {
        const matchedDept = departments.find(
          (dept) =>
            dept.name?.toLowerCase() === aiDetails.assignedDepartment?.toLowerCase()
        )
        if (matchedDept) {
          departmentId = matchedDept._id
        }
      }

      //get the matching categoryid  too
      let categoryId = category
      if (!categoryId && aiDetails.assignedCategory) {
        const matchedCategory = categories.find(
          (cat) =>
            cat.name?.toLowerCase() === aiDetails.assignedCategory?.toLowerCase()
        )
        if (matchedCategory) {
          categoryId = matchedCategory._id
        }
      }

      // Calculate due date: Use provided dueDate, or AI-predicted, or default to 1 day
      let finalDueDate = null
      if (dueDate) {
        // User provided due date - use it
        finalDueDate = new Date(dueDate)
        console.log('Using user-provided due date (web):', finalDueDate)
      } else {
        // Use AI-predicted due date or default to 1 day
        const aiDueDateDays = aiDetails.suggestedDueDateDays
        const daysToAdd = aiDueDateDays && aiDueDateDays > 0 ? aiDueDateDays : 1
        finalDueDate = new Date()
        finalDueDate.setDate(finalDueDate.getDate() + daysToAdd)
        console.log(`AI predicted due date (web): ${daysToAdd} days from now (${finalDueDate.toISOString()}), AI suggested: ${aiDueDateDays || 'null'}`)
      }

      const issue = await Issue.create({
        title: fallbackTitle,
        description: description || '',
        priority: aiPriority || priority,
        images,
        site,
        category: categoryId,
        department: departmentId,
        assignedTo: assignedTo || null,
        dueDate: finalDueDate,
        clientId: req.user?.clientId,
        userId: req.user?.userId,
        locationId: finalLocationId || null,
        createdGps: {
          latitude: lat,
          longitude: lng,
        },
        platform: platform || 'web', // Default to web for web API
        aiReportAnalysis: {
          suggestedPersonal: aiDetails.suggestedPersonal || [],
          potentialRisks: aiDetails.potentialRisks || [],
          aiIssueTitle: aiTitle || fallbackTitle,
        },
      })

      pushIssueComment(issue, {
        type: 'created',
        message: 'Issue created by user',
        userId: req.user?.userId || null,
      })
      await issue.save()

      // Log issue creation
      try {
        await logIssueCreationOrganization(
          issue._id.toString(),
          req.user?.userId || null,
          req.user?.clientId || null,
          {
            title: fallbackTitle,
            priority: aiPriority || priority,
            siteId: site?.toString(),
            categoryId: categoryId?.toString(),
            departmentId: departmentId?.toString(),
            hasImage: images.length > 0,
          }
        )
      } catch (logError) {
        console.error('Error logging issue creation (organization):', logError)
        // Don't fail the request if logging fails
      }

      res.status(201).json(issue)
    } catch (error) {
      // Log the error to database - ensure it's always logged even if logging fails
      try {
        const { logError } = require('../src/utils/logger')
        await logError(error, {
          userId: req.user?.userId,
          clientId: req.user?.clientId,
          metadata: {
            endpoint: 'POST /api/issues',
            method: 'create-issue-organization',
            requestBody: {
              title: req.body.title,
              siteId: req.body.siteId || req.body.site,
              priority: req.body.priority,
              hasImage: !!req.file,
            },
          },
        })
      } catch (logErr) {
        // If logging fails, at least log to console
        console.error('CRITICAL: Failed to log error to database:', logErr)
        console.error('Original error:', error)
      }
      
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Public endpoint: Create issue from QR code scan (no authentication required)
router.post(
  '/public',
  upload.single('image'),
  [
    body('description').optional().trim(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    body('locationId').notEmpty().withMessage('Location ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        // Log validation errors
        try {
          const { logWarning } = require('../src/utils/logger')
          await logWarning(`Validation error in public issue creation: ${errors.array()[0].msg}`, {
            metadata: {
              endpoint: 'POST /api/issues/public',
              method: 'create-issue-public',
              validationErrors: errors.array(),
            },
          })
        } catch (logErr) {
          console.error('Failed to log validation error:', logErr)
        }
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { title, description, priority = 'medium', locationId, siteId, category, department, dueDate, latitude, longitude, platform = 'public' } = req.body

      // Validate GPS coordinates are required
      if (!latitude || !longitude) {
        
        return res.status(400).json({ 
          message: 'GPS location is required. Please enable location services and try again.',
          code: 'GPS_REQUIRED'
        })
      }

      // Validate GPS coordinates are valid numbers
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ 
          message: 'Invalid GPS coordinates. Please try capturing location again.',
          code: 'INVALID_GPS'
        })
      }

      // Validate GPS coordinates are within valid ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ 
          message: 'GPS coordinates are out of valid range.',
          code: 'INVALID_GPS_RANGE'
        })
      }

      if (!locationId) {
        // Log missing location ID error
        try {
          const { logWarning } = require('../src/utils/logger')
          await logWarning('Location ID is required for public issue creation', {
            metadata: {
              endpoint: 'POST /api/issues/public',
              method: 'create-issue-public',
            },
          })
        } catch (logErr) {
          console.error('Failed to log error:', logErr)
        }
        return res.status(400).json({ message: 'Location ID is required' })
      }

      // Validate locationId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({ message: 'Invalid location ID format' })
      }

      // Get location to find site and client
      const Location = require('../src/models/Location')
      const location = await Location.findById(locationId)
        .populate('siteId', 'name clientId')
        .lean()

      if (!location) {
        return res.status(404).json({ message: 'Location not found' })
      }

      if (!location.siteId) {
        return res.status(400).json({ message: 'Location is not associated with a site' })
      }

      // Use siteId from request body if provided, otherwise extract from location
      let finalSiteId = siteId // siteId from request body
      
      if (!finalSiteId && location.siteId) {
        // Extract siteId from location if not provided in request
        if (typeof location.siteId === 'object' && location.siteId !== null) {
          // Populated siteId object
          finalSiteId = location.siteId._id || location.siteId
        } else {
          // Non-populated siteId (just the ID)
          finalSiteId = location.siteId
        }
      }

      if (!finalSiteId) {
        return res.status(400).json({ message: 'Site ID is required. Please provide siteId or ensure location has an associated site.' })
      }

      // Convert to string first if it's an ObjectId
      const siteIdString = finalSiteId?.toString ? finalSiteId.toString() : finalSiteId

      // Ensure siteId is a valid ObjectId and convert to ObjectId
      if (!siteIdString || !mongoose.Types.ObjectId.isValid(siteIdString)) {
        console.error('Invalid siteId:', { siteId: finalSiteId, siteIdString, locationSiteId: location.siteId })
        return res.status(400).json({ message: 'Invalid site ID format' })
      }
      
      // Convert to ObjectId to ensure proper format
      finalSiteId = new mongoose.Types.ObjectId(siteIdString)

      const clientId = location.clientId || (typeof location.siteId === 'object' ? location.siteId.clientId : null)

      if (!clientId) {
        return res.status(400).json({ message: 'Location is not associated with a client' })
      }

      // Ensure clientId is a valid ObjectId and convert to ObjectId
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID from location' })
      }
      
      // Convert to ObjectId to ensure proper format
      const clientIdObjectId = new mongoose.Types.ObjectId(clientId)

      // Validate dueDate if provided
      if (dueDate) {
        const due = new Date(dueDate)
        if (isNaN(due.getTime())) {
          return res.status(400).json({ message: 'Invalid due date format' })
        }
        if (due < new Date()) {
          return res.status(400).json({ message: 'Due date cannot be in the past' })
        }
      }

      const departments = await Department.find({ clientId })
      const categories = await Category.find({ clientId })
      const priorities = Array.isArray(priorityOptions) ? priorityOptions : ['low', 'medium', 'high', 'critical']

      let aiDetails = {}
      try {
        const siteName = location.siteId?.name || (typeof location.siteId === 'object' ? location.siteId.name : 'Unknown Site')
        // For public submissions, use IP address as identifier
        const publicIdentifier = req.ip || req.connection?.remoteAddress || `public-${locationId}`
        
        // Calculate image hash to detect same image even with different URLs
        let imageHash = null
        if (req.file?.location) {
          imageHash = await openai.calculateImageHash(req.file.location)
        }
        
        aiDetails = await openai.getIssueDetails(
          description || '',
          siteName,
          req.file?.location,
          departments,
          categories,
          priorities,
          null, // userId is null for public submissions
          clientIdObjectId.toString(),
          publicIdentifier,
          imageHash // Pass the calculated hash
        )
      } catch (aiError) {
        console.error('Failed to fetch AI issue details:', aiError)
      }

      // Check if AI requires user input (description or new image)
      const hasDescription = description?.trim()
      const hasImage = req.file?.location
      
      if (aiDetails.requiresUserInput === true) {
        // Check if this is a repeated submission (3+ times) - applies to all REQUIRES_USER_INPUT cases
        if (aiDetails.repeatedSubmission === true && hasImage && !hasDescription) {
          return res.status(400).json({
            message: 'This image has been submitted multiple times without additional details. Please provide a description or submit a different image.',
            code: 'REQUIRES_USER_INPUT_REPEATED',
            reason: aiDetails.reason || 'Image has been submitted too many times without details',
            submissionCount: aiDetails.submissionCount || 3
          })
        }
        
        // If image is available but unclear, return specific error
        if (aiDetails.imageUnclear === true && hasImage) {
          return res.status(400).json({
            message: 'The provided image is unclear, blurry, or cannot be analyzed. Please provide a clearer image or add a description.',
            code: 'IMAGE_UNCLEAR',
            reason: aiDetails.reason || 'Image is not clear enough for AI analysis'
          })
        }
        
        if (!hasDescription && !hasImage) {
          return res.status(400).json({
            message: 'Please provide a description or upload an image to help AI understand the issue.',
            code: 'REQUIRES_USER_INPUT'
          })
        }
        
        if (!hasDescription && hasImage) {
          return res.status(400).json({
            message: 'AI could not process the image. Please provide a description to help AI understand the issue better.',
            code: 'REQUIRES_USER_INPUT',
            reason: aiDetails.reason || 'AI needs more context'
          })
        }
        
        if (hasDescription && !hasImage) {
          return res.status(400).json({
            message: 'AI needs more information. Please upload an image or provide a more detailed description.',
            code: 'REQUIRES_USER_INPUT',
            reason: aiDetails.reason || 'AI needs more context'
          })
        }
      }

      const images = req.file?.location ? [req.file.location] : []

      const aiTitle = typeof aiDetails.title === 'string' ? aiDetails.title.trim() : ''
      const fallbackTitle =
        title?.trim() ||
        aiTitle ||
        (description?.length > 80 ? `${description.slice(0, 77)}...` : description) ||
        'Issue Report'

      const aiPriority = priorities.includes(aiDetails.priority) ? aiDetails.priority : null

      let departmentId = department
      if (!departmentId && aiDetails.assignedDepartment) {
        const matchedDept = departments.find(
          (dept) =>
            dept.name?.toLowerCase() === aiDetails.assignedDepartment?.toLowerCase()
        )
        if (matchedDept) {
          departmentId = matchedDept._id
        }
      }

      let categoryId = category
      if (!categoryId && aiDetails.assignedCategory) {
        const matchedCategory = categories.find(
          (cat) =>
            cat.name?.toLowerCase() === aiDetails.assignedCategory?.toLowerCase()
        )
        if (matchedCategory) {
          categoryId = matchedCategory._id
        }
      }

      // Calculate due date: Use provided dueDate, or AI-predicted, or default to 1 day
      let finalDueDate = null
      if (dueDate) {
        // User provided due date - use it
        finalDueDate = new Date(dueDate)
        console.log('Using user-provided due date (public):', finalDueDate)
      } else {
        // Use AI-predicted due date or default to 1 day
        const aiDueDateDays = aiDetails.suggestedDueDateDays
        const daysToAdd = aiDueDateDays && aiDueDateDays > 0 ? aiDueDateDays : 1
        finalDueDate = new Date()
        finalDueDate.setDate(finalDueDate.getDate() + daysToAdd)
        console.log(`AI predicted due date (public): ${daysToAdd} days from now (${finalDueDate.toISOString()}), AI suggested: ${aiDueDateDays || 'null'}`)
      }

      // Convert category and department to ObjectId if provided
      const categoryObjectId = categoryId && mongoose.Types.ObjectId.isValid(categoryId) 
        ? new mongoose.Types.ObjectId(categoryId) 
        : null
      const departmentObjectId = departmentId && mongoose.Types.ObjectId.isValid(departmentId) 
        ? new mongoose.Types.ObjectId(departmentId) 
        : null
      const locationObjectId = locationId && mongoose.Types.ObjectId.isValid(locationId) 
        ? new mongoose.Types.ObjectId(locationId) 
        : null

      const issue = await Issue.create({
        title: fallbackTitle,
        description: description || '',
        priority: aiPriority || priority,
        images,
        site: finalSiteId,
        category: categoryObjectId,
        department: departmentObjectId,
        assignedTo: null, // Public users can't assign
        dueDate: finalDueDate,
        clientId: clientIdObjectId,
        userId: null, // Public issue - no user
        locationId: locationObjectId, // Store location reference
        createdGps: {
          latitude: lat,
          longitude: lng,
        },
        platform: platform || 'public', // Default to public for public API
        aiReportAnalysis: {
          suggestedPersonal: aiDetails.suggestedPersonal || [],
          potentialRisks: aiDetails.potentialRisks || [],
          aiIssueTitle: aiTitle || fallbackTitle,
        },
      })

      pushIssueComment(issue, {
        type: 'created',
        message: 'Issue created by Public',
        userId: null,
      })
      await issue.save()

      // Log issue creation
      try {
        await logIssueCreationPublic(
          issue._id.toString(),
          clientIdObjectId.toString(),
          {
            title: fallbackTitle,
            priority: aiPriority || priority,
            siteId: finalSiteId.toString(),
            locationId: locationId,
            categoryId: categoryObjectId?.toString(),
            departmentId: departmentObjectId?.toString(),
            hasImage: images.length > 0,
          }
        )
      } catch (logError) {
        console.error('Error logging issue creation (public):', logError)
        // Don't fail the request if logging fails
      }

      // Populate department and category for response
      const populatedIssue = await Issue.findById(issue._id)
        .populate('department', 'name')
        .populate('category', 'name')
        .populate('site', 'name')
        .lean()

      // Get department and category names
      const departmentName = populatedIssue.department?.name || null
      const categoryName = populatedIssue.category?.name || null

      // Create user-friendly response message
      let responseMessage = 'Issue has been submitted'
      
      if (departmentName && categoryName) {
        responseMessage = `Issue has been submitted and assigned to ${departmentName} department and ${categoryName} category.`
      } else if (departmentName) {
        responseMessage = `Issue has been submitted and assigned to ${departmentName} department.`
      } else if (categoryName) {
        responseMessage = `Issue has been submitted and assigned to ${categoryName} category.`
      } else {
        responseMessage = 'Issue has been submitted successfully.'
      }

      res.status(201).json({
        ...populatedIssue,
        message: responseMessage,
        departmentName: departmentName || 'Not assigned',
        categoryName: categoryName || 'Not assigned'
      })
    } catch (error) {
      // Log the error to database - ensure it's always logged even if logging fails
      try {
        const { logError } = require('../src/utils/logger')
        await logError(error, {
          clientId: clientIdObjectId?.toString(),
          metadata: {
            endpoint: 'POST /api/issues/public',
            method: 'create-issue-public',
            locationId: locationId,
            siteId: siteId,
            requestBody: {
              title: req.body.title,
              priority: req.body.priority,
              hasImage: !!req.file,
            },
          },
        })
      } catch (logErr) {
        // If logging fails, at least log to console
        console.error('CRITICAL: Failed to log error to database:', logErr)
        console.error('Original error:', error)
      }
      
      console.error('Public issue creation error:', error)
      console.error('Error stack:', error.stack)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        errors: error.errors,
        code: error.code,
      })
      
      // Provide more detailed error message
      const errorMessage = error.message || 'Server error'
      const isValidationError = error.name === 'ValidationError'
      const isCastError = error.name === 'CastError'
      
      if (isValidationError) {
        const validationErrors = error.errors ? Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        })) : []
        return res.status(400).json({ 
          message: `Validation error: ${errorMessage}`,
          validationErrors: validationErrors,
          details: error.errors || error.message
        })
      }
      
      if (isCastError) {
        return res.status(400).json({ 
          message: `Invalid data format: ${errorMessage}`,
          details: error.message
        })
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        errorName: error.name
      })
    }
  }
)

// Update issue status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    // Find the issue first to check permissions
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('userId', 'name email')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Check if user can accept/resolve this issue
    const canAccept = await canUserAcceptOrResolveIssue(issue, req.user)
    if (!canAccept) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this issue. The issue is assigned to a specific user or department.' 
      })
    }

    const oldStatus = issue.status
    issue.status = status
    const statusLabels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed' }
    pushIssueComment(issue, {
      type: 'status',
      message: `Status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[status] || status}`,
      userId: req.user?.userId || null,
      payload: { oldStatus, newStatus: status },
    })
    await issue.save()

    const updatedIssue = await Issue.findById(issue._id)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    res.json(updatedIssue)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.patch('/:id/resolve', protect, upload.single('resolutionImage'), async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('userId', 'name email')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Check if user can accept/resolve this issue
    const canResolve = await canUserAcceptOrResolveIssue(issue, req.user)
    if (!canResolve) {
      return res.status(403).json({ 
        message: 'You do not have permission to resolve this issue. The issue is assigned to a specific user or department.' 
      })
    }

    const resolutionDescription = req.body?.resolutionDescription?.trim() || ''
    const resolutionImageUrl = req.file?.location || ''
    const { latitude, longitude } = req.body

    if (!resolutionDescription && !resolutionImageUrl) {
      return res
        .status(400)
        .json({ message: 'Please provide a resolution image or description for validation.' })
    }

    // Validate GPS coordinates are required
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'GPS location is required for resolution. Please enable location services and try again.',
        code: 'GPS_REQUIRED'
      })
    }

    // Validate GPS coordinates are valid numbers
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        message: 'Invalid GPS coordinates. Please try capturing location again.',
        code: 'INVALID_GPS'
      })
    }

    // Validate GPS coordinates are within valid ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        message: 'GPS coordinates are out of valid range.',
        code: 'INVALID_GPS_RANGE'
      })
    }

    // Check if issue has creation GPS
    if (!issue.createdGps || !issue.createdGps.latitude || !issue.createdGps.longitude) {
      return res.status(400).json({ 
        message: 'Issue does not have creation GPS location. Cannot validate resolution location.',
        code: 'MISSING_CREATION_GPS'
      })
    }

    // Calculate distance between creation and resolution GPS (Haversine formula)
    const R = 6371e3 // Earth's radius in meters
    const φ1 = issue.createdGps.latitude * Math.PI / 180
    const φ2 = lat * Math.PI / 180
    const Δφ = (lat - issue.createdGps.latitude) * Math.PI / 180
    const Δλ = (lng - issue.createdGps.longitude) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in meters

    // Allow 50 meters tolerance (GPS can have some variance)
    const toleranceMeters = 50
    if (distance > toleranceMeters) {
      return res.status(400).json({
        message: `GPS location mismatch. You are ${Math.round(distance)}m away from the issue location (${Math.round(toleranceMeters)}m tolerance). Please resolve the issue at the correct location.`,
        code: 'GPS_MISMATCH',
        distance: Math.round(distance),
        tolerance: toleranceMeters,
        createdGps: {
          latitude: issue.createdGps.latitude,
          longitude: issue.createdGps.longitude,
        },
        resolvedGps: {
          latitude: lat,
          longitude: lng,
        },
      })
    }

    let validationResult = null
    try {
      validationResult = await openai.validateResolution(
        resolutionDescription,
        resolutionImageUrl,
        issue.images || [],
        issue.title,
        issue.description,
        issue.priority,
        issue.status,
        issue.createdGps,
        { latitude: lat, longitude: lng },
        distance
      )
    } catch (validationError) {
      console.error('Resolution validation failed:', validationError)
      return res.status(502).json({ message: 'Failed to validate resolution with AI.' })
    }

    // Combine GPS validation with AI validation
    const gpsValid = distance <= 50
    const aiValid = validationResult?.resolved === true

    if (!aiValid) {
      // Build comprehensive error message
      let errorMessage = validationResult?.reasoning || 'AI validation could not confirm that the issue is resolved.'
      
      if (validationResult?.imageComparison) {
        errorMessage += `\n\nImage Analysis: ${validationResult.imageComparison}`
      }
      
      if (validationResult?.missingDetails && validationResult.missingDetails.length > 0) {
        errorMessage += `\n\nMissing Details: ${validationResult.missingDetails.join(', ')}`
      }
      
      if (!gpsValid) {
        errorMessage += `\n\nGPS Location: You are ${Math.round(distance)}m away from the issue location (50m tolerance).`
      }

      return res.status(400).json({
        message: errorMessage,
        validation: validationResult,
        gpsValid,
        aiValid,
      })
    }

    // If GPS doesn't match but AI says resolved, warn but allow (with lower confidence)
    if (!gpsValid && aiValid) {
      validationResult.gpsWarning = true
      validationResult.gpsWarningMessage = `Warning: Resolution location is ${Math.round(distance)}m away from issue location. Resolution accepted based on image/description analysis.`
      // Reduce confidence slightly if GPS doesn't match
      if (validationResult.aiConfidence) {
        validationResult.aiConfidence = Math.max(0, validationResult.aiConfidence - 0.1)
      }
    }

    if (resolutionImageUrl) {
      issue.resolutionImages = issue.resolutionImages || []
      issue.resolutionImages.push(resolutionImageUrl)
    }

    if (resolutionDescription) {
      issue.resolutionDescription = resolutionDescription
    }

    issue.status = 'resolved'
    issue.resolutionTime = new Date()
    issue.resolvedGps = {
      latitude: lat,
      longitude: lng,
    }
    issue.aiResolutionAnalysis = validationResult
    pushIssueComment(issue, {
      type: 'resolved',
      message: 'Issue resolved',
      userId: req.user?.userId || null,
    })
    await issue.save()

    const updatedIssue = await Issue.findById(issue._id)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    res.json({
      issue: updatedIssue,
      validation: validationResult,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Assign issue to a user
router.patch('/:id/assign', protect, [
  body('userId').optional().isMongoId().withMessage('Invalid user ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { userId } = req.body

    // Find the issue
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Only admins, super admins, and client admins can assign issues
    if (req.user?.role !== 'saas-owner' && 
        req.user?.role !== 'superadmin' && 
        req.user?.role !== 'client') {
      return res.status(403).json({ 
        message: 'You do not have permission to assign issues' 
      })
    }

    let assignedUserName = null
    // If userId is provided, verify the user exists and belongs to the same client
    if (userId) {
      const assignedUser = await User.findOne({
        _id: userId,
        clientId: req.user?.clientId,
      })

      if (!assignedUser) {
        return res.status(404).json({ message: 'User not found or does not belong to your client' })
      }

      assignedUserName = assignedUser.name
      issue.assignedTo = userId
    } else {
      // If userId is null/empty, unassign (assign to department only)
      issue.assignedTo = null
    }

    pushIssueComment(issue, {
      type: 'assigned',
      message: assignedUserName
        ? `Issue assigned to ${assignedUserName}`
        : 'Issue unassigned',
      userId: req.user?.userId || null,
      payload: userId ? { assignedTo: userId } : {},
    })
    await issue.save()

    const updatedIssue = await Issue.findById(issue._id)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    res.json(updatedIssue)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Update due date only
router.patch('/:id/due-date', protect, [
  body('dueDate').optional(),
], async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    const rawDueDate = req.body.dueDate
    const newDueDate = rawDueDate === null || rawDueDate === '' || rawDueDate === undefined
      ? null
      : new Date(rawDueDate)

    if (newDueDate !== null && isNaN(newDueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date format' })
    }

    if (newDueDate !== null && newDueDate < new Date()) {
      return res.status(400).json({ message: 'Due date cannot be in the past' })
    }

    const oldDueDate = issue.dueDate
    const oldStr = oldDueDate instanceof Date ? oldDueDate.toISOString() : String(oldDueDate ?? '')
    const newStr = newDueDate instanceof Date ? newDueDate.toISOString() : String(newDueDate ?? '')
    if (oldStr !== newStr) {
      issue.dueDate = newDueDate
      pushIssueComment(issue, {
        type: 'edit',
        message: `Due date updated: ${oldStr || '—'} → ${newStr || '—'}`,
        userId: req.user?.userId || null,
        payload: { changedFields: ['dueDate'], fieldChanges: { dueDate: { from: oldDueDate, to: newDueDate } } },
      })
    }

    await issue.save()

    const updatedIssue = await Issue.findById(issue._id)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    res.json(updatedIssue)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Update issue (title, description, priority, etc.) and record edit comments
router.patch('/:id', protect, [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('dueDate').optional(),
  body('category').optional(),
], async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('category', 'name description')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    const allowed = ['title', 'description', 'priority', 'dueDate']
    const changes = []
    const fieldChanges = {}

    for (const field of allowed) {
      if (req.body[field] === undefined) continue
      const newVal = field === 'dueDate' && req.body[field]
        ? (req.body[field] ? new Date(req.body[field]) : null)
        : req.body[field]
      const oldVal = issue[field]
      const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? '')
      const newStr = newVal instanceof Date ? newVal.toISOString() : String(newVal ?? '')
      if (oldStr !== newStr) {
        changes.push(field)
        fieldChanges[field] = { from: oldVal, to: newVal }
        issue[field] = newVal
      }
    }

    // Category: optional, must be valid ObjectId and belong to client
    if (req.body.category !== undefined) {
      const rawCategory = req.body.category
      const newCategoryId = (rawCategory === null || rawCategory === '') ? null : rawCategory
      if (newCategoryId && !mongoose.Types.ObjectId.isValid(newCategoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' })
      }
      if (newCategoryId) {
        const categoryDoc = await Category.findOne({
          _id: newCategoryId,
          clientId: req.user?.clientId,
        })
        if (!categoryDoc) {
          return res.status(400).json({ message: 'Category not found or does not belong to your client' })
        }
      }
      const oldCategoryId = issue.category?._id?.toString() || issue.category?.toString() || ''
      const newCategoryIdStr = newCategoryId ? String(newCategoryId) : ''
      if (oldCategoryId !== newCategoryIdStr) {
        changes.push('category')
        fieldChanges.category = {
          from: issue.category,
          to: newCategoryId ? new mongoose.Types.ObjectId(newCategoryId) : null,
        }
        issue.category = newCategoryId ? new mongoose.Types.ObjectId(newCategoryId) : null
      }
    }

    if (changes.length > 0) {
      const changeText = changes.map((f) => {
        const c = fieldChanges[f]
        const from = c.from instanceof Date ? c.from.toISOString() : (c.from ?? '—')
        const to = c.to instanceof Date ? c.to.toISOString() : (c.to ?? '—')
        return `${f}: ${from} → ${to}`
      }).join('; ')
      pushIssueComment(issue, {
        type: 'edit',
        message: `Updated: ${changeText}`,
        userId: req.user?.userId || null,
        payload: { changedFields: changes, fieldChanges },
      })
    }

    await issue.save()

    const updatedIssue = await Issue.findById(issue._id)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')

    res.json(updatedIssue)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get AI suggestions
router.post('/:id/ai-suggestions', protect, async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      userId: req.user?.id,
    })

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Create prompt for OpenAI
    const prompt = `You are an expert technical support assistant. Analyze the following issue and provide 3-5 actionable suggestions for resolution.

Issue Title: ${issue.title}
Description: ${issue.description}
Priority: ${issue.priority}
Status: ${issue.status}

Provide your suggestions as a numbered list, each suggestion should be clear, specific, and actionable. Focus on practical solutions.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful technical support assistant that provides clear, actionable solutions to technical issues.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0].message.content || ''
    
    // Extract suggestions (assuming they're numbered)
    const suggestions = aiResponse
      .split('\n')
      .filter((line) => /^\d+[\.\)]/.test(line.trim()))
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 0)

    // Update issue with AI suggestions
    issue.aiSuggestions = suggestions
    await issue.save()

    res.json({
      suggestions,
      analysis: aiResponse,
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    res.status(500).json({ message: 'Failed to get AI suggestions' })
  }
})

router.post('/classify', protect, async (req, res) => {
  try {
    const { title = '', description = '', siteName = '', currentCategory = '', currentPriority = '', attachments = [] } = req.body || {}

    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required for classification' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OpenAI API key is not configured' })
    }

    // Fetch actual departments and categories from database
    const departments = await Department.find({ clientId: req.user?.clientId }).select('name')
    const categories = await Category.find({ clientId: req.user?.clientId }).select('name')

    const departmentOptions = departments.map(d => d.name)
    const categoryOptions = categories.map(c => c.name)

    // If no departments/categories exist, provide fallback options
    if (departmentOptions.length === 0) {
      departmentOptions.push('General')
    }
    if (categoryOptions.length === 0) {
      categoryOptions.push('Other')
    }

    const fetchImpl = typeof fetch !== 'undefined'
      ? fetch
      : (await import('node-fetch')).default

    const userPayload = {
      title,
      description,
      siteName,
      currentCategory,
      currentPriority,
      attachments,
      departmentOptions,
      categoryOptions,
      priorityLevels: ['low', 'medium', 'high', 'critical'],
    }

    const response = await fetchImpl(endpoints.open_ai_chat, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: gptGenericModel,
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that triages facility maintenance tickets. Choose the department, category, and priority that best match the issue. Departments must be one of: ${departmentOptions.join(', ')}. Categories should be one of: ${categoryOptions.join(', ')} (pick the closest match). Priority must be one of: low, medium, high, or critical. Always respond with JSON following this schema:
{
  "department": { "name": "string", "reason": "string" },
  "category": { "name": "string", "reason": "string" },
  "priority": { "level": "low|medium|high|critical", "reason": "string" },
  "confidence": number (0-1),
  "recommendedTeams": ["optional", "..."]
}
`,
          },
          {
            role: 'user',
            content: JSON.stringify(userPayload, null, 2),
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI classification failed:', response.status, errorText)
      return res.status(500).json({ message: 'Failed to classify issue' })
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    const parsed = sanitizeJsonContent(content)

    if (!parsed) {
      return res.status(502).json({ message: 'AI returned an unreadable response' })
    }

    const result = {
      department: parsed.department || null,
      category: parsed.category || null,
      priority: parsed.priority || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      recommendedTeams: Array.isArray(parsed.recommendedTeams) ? parsed.recommendedTeams : [],
      raw: content,
    }

    res.json(result)
  } catch (error) {
    console.error('AI classification error:', error)
    res.status(500).json({ message: 'Failed to classify issue' })
  }
})

module.exports = router


