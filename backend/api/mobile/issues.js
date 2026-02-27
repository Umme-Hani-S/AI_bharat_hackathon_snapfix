const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../../src/middleware/auth')
const Issue = require('../../src/models/Issue')
const Department = require('../../src/models/Department')
const Category = require('../../src/models/Category')
const User = require('../../src/models/User')
const Site = require('../../src/models/Site')
const { upload } = require('../../src/config/s3')
const openai = require('../../src/config/openai')
const priorityOptions = require('../../src/config/priority')
const { logIssueCreationMobile, logError, logWarning } = require('../../src/utils/logger')
const { getGeneralLocationForSite } = require('../../src/utils/locationHelper')

const router = express.Router()

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
    return false
  }

  // If issue is assigned to a specific user, only that user can accept/resolve
  if (issue.assignedTo) {
    const assignedToId = issue.assignedTo._id?.toString() || issue.assignedTo.toString()
    const userId = user.userId?.toString() || user.id?.toString()
    return assignedToId === userId
  }

  // If issue is assigned to a department, any user from that department can accept/resolve
  if (issue.department) {
    const departmentId = issue.department._id?.toString() || issue.department.toString()
    const userDepartmentIds = user.departmentIds || []
    return userDepartmentIds.some(
      (deptId) => deptId.toString() === departmentId
    )
  }

  // If no assignment, only the creator can accept/resolve
  const issueUserId = issue.userId._id?.toString() || issue.userId.toString()
  const userId = user.userId?.toString() || user.id?.toString()
  return issueUserId === userId
}

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

// Get all issues (mobile-optimized with pagination)
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const status = req.query.status
    const priority = req.query.priority

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
        return res.json({ issues: [], total: 0, page, limit, totalPages: 0 })
      }
    } else if (req.user?.role === 'vendors') {
      query.assignedTo = req.user?.userId
    } else if (req.user?.role === 'tenants') {
      query.userId = req.user?.userId
    } else {
      query.userId = req.user?.userId
    }

    // Apply filters
    if (status) {
      query.status = status
    }
    if (priority) {
      query.priority = priority
    }

    const total = await Issue.countDocuments(query)
    const issues = await Issue.find(query)
      .populate('site', 'name code')
      .populate('department', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Mobile-optimized response (lighter payload)
    const formattedIssues = issues.map(issue => ({
      _id: issue._id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      site: issue.site ? { _id: issue.site._id, name: issue.site.name, code: issue.site.code } : null,
      department: issue.department ? { _id: issue.department._id, name: issue.department.name } : null,
      category: issue.category ? { _id: issue.category._id, name: issue.category.name } : null,
      assignedTo: issue.assignedTo ? { _id: issue.assignedTo._id, name: issue.assignedTo.name } : null,
      userId: issue.userId ? { _id: issue.userId._id, name: issue.userId.name } : null,
      images: issue.images || [],
      imageCount: (issue.images || []).length,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      resolutionTime: issue.resolutionTime,
    }))

    res.json({
      issues: formattedIssues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    // Log the error
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        metadata: {
          endpoint: 'GET /api/mobile/issues',
          method: 'get-issues-mobile',
          query: req.query,
        },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get single issue (mobile-optimized)
router.get('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })
      .populate('site', 'name code location')
      .populate('department', 'name')
      .populate('category', 'name description')
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.userId', 'name email')

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Check permissions for tenants/vendors
    if (req.user?.role === 'tenants' && issue.userId._id.toString() !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' })
    }
    if (req.user?.role === 'vendors' && issue.assignedTo?._id?.toString() !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(issue)
  } catch (error) {
    // Log the error
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        metadata: {
          endpoint: 'GET /api/mobile/issues/:id',
          method: 'get-issue-mobile',
          issueId: req.params.id,
        },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create issue (mobile-optimized, supports image uploads)
router.post(
  '/',
  protect,
  upload.array('images', 10),
  [
    body('description').optional().trim(), // Description is optional if image is provided
    body('siteId').isMongoId().withMessage('Valid site ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        // Log validation errors
        try {
          await logWarning(`Validation error in mobile issue creation: ${errors.array()[0].msg}`, {
            userId: req.user?.userId,
            clientId: req.user?.clientId,
            metadata: {
              endpoint: 'POST /api/mobile/issues',
              method: 'create-issue-mobile',
              validationErrors: errors.array(),
            },
          })
        } catch (logErr) {
          console.error('Failed to log validation error:', logErr)
        }
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { description, siteId, categoryId, department, priority, title, locationId, latitude, longitude, platform } = req.body

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

      // Get uploaded images (mobile API supports multiple images)
      const images = req.files?.map((file) => file.location) || []
      const firstImageUrl = images.length > 0 ? images[0] : null

      // If locationId is not provided, find and assign the General location for the site
      let finalLocationId = locationId
      if (!finalLocationId && siteId) {
        const generalLocation = await getGeneralLocationForSite(siteId, req.user?.clientId)
        if (generalLocation) {
          finalLocationId = generalLocation._id
          console.log(`Assigned General location (${generalLocation.name}) to issue for site: ${siteId}`)
        } else {
          console.warn(`General location not found for site: ${siteId}. Issue will be created without location.`)
        }
      }

      // Validate: Either description OR image must be provided
      const hasDescription = description?.trim()
      const hasImage = firstImageUrl
      
      if (!hasDescription && !hasImage) {
        // Log validation error
        try {
          await logWarning('Validation error in mobile issue creation: Either description or image is required', {
            userId: req.user?.userId,
            clientId: req.user?.clientId,
            metadata: {
              endpoint: 'POST /api/mobile/issues',
              method: 'create-issue-mobile',
              validationError: 'MISSING_DESCRIPTION_AND_IMAGE',
            },
          })
        } catch (logErr) {
          console.error('Failed to log validation error:', logErr)
        }
        return res.status(400).json({ 
          message: 'Either a description or an image is required to create an issue.',
          code: 'MISSING_DESCRIPTION_AND_IMAGE'
        })
      }

      // Fetch departments, categories, and site for AI classification
      const departments = await Department.find({ clientId: req.user?.clientId })
      const categories = await Category.find({ clientId: req.user?.clientId })
      const site = await Site.findById(siteId).select('name')
      const priorities = Array.isArray(priorityOptions) ? priorityOptions : ['low', 'medium', 'high', 'critical']

      // AI Classification
      let aiDetails = {}
      try {
        // Calculate image hash to detect same image even with different URLs
        let imageHash = null
        if (firstImageUrl) {
          imageHash = await openai.calculateImageHash(firstImageUrl)
        }
        
        aiDetails = await openai.getIssueDetails(
          description,
          site?.name || '',
          firstImageUrl,
          departments,
          categories,
          priorities,
          req.user?.userId || null,
          req.user?.clientId || null,
          null, // publicIdentifier not needed for authenticated mobile users
          imageHash // Pass the calculated hash
        )
      } catch (aiError) {
        console.error('Failed to fetch AI issue details for mobile:', aiError)
        // Log AI errors to database
        try {
          await logError(aiError, {
            userId: req.user?.userId,
            clientId: req.user?.clientId,
            metadata: {
              endpoint: 'POST /api/mobile/issues',
              method: 'create-issue-mobile',
              errorType: 'AI_ERROR',
              siteId: siteId?.toString(),
            },
          })
        } catch (logErr) {
          console.error('Failed to log AI error:', logErr)
        }
        // Continue without AI if it fails
      }

      // Check if AI requires user input (description or new image)
      if (aiDetails.requiresUserInput === true) {
        const hasDescription = description?.trim()
        const hasImage = firstImageUrl
        
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

      // Use AI-generated title if available, otherwise use provided title or fallback
      const aiTitle = typeof aiDetails.title === 'string' ? aiDetails.title.trim() : ''
      const fallbackTitle =
        title?.trim() ||
        aiTitle ||
        (description?.length > 80 ? `${description.slice(0, 77)}...` : description)

      // Use AI priority if available and valid, otherwise use provided priority
      const aiPriority = priorities.includes(aiDetails.priority) ? aiDetails.priority : null

      // Match AI-suggested department to actual department ID
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

      // Match AI-suggested category to actual category ID
      let categoryIdFinal = categoryId
      if (!categoryIdFinal && aiDetails.assignedCategory) {
        const matchedCategory = categories.find(
          (cat) =>
            cat.name?.toLowerCase() === aiDetails.assignedCategory?.toLowerCase()
        )
        if (matchedCategory) {
          categoryIdFinal = matchedCategory._id
        }
      }

      // Calculate due date: Use provided dueDate, or AI-predicted, or default to 1 day
      let finalDueDate = null
      if (req.body.dueDate) {
        // User provided due date - use it
        finalDueDate = new Date(req.body.dueDate)
        console.log('Using user-provided due date (mobile):', finalDueDate)
      } else {
        // Use AI-predicted due date or default to 1 day
        const aiDueDateDays = aiDetails.suggestedDueDateDays
        const daysToAdd = aiDueDateDays && aiDueDateDays > 0 ? aiDueDateDays : 1
        finalDueDate = new Date()
        finalDueDate.setDate(finalDueDate.getDate() + daysToAdd)
        console.log(`AI predicted due date (mobile): ${daysToAdd} days from now (${finalDueDate.toISOString()})`)
      }

      const issue = await Issue.create({
        title: fallbackTitle,
        description,
        priority: aiPriority || priority || 'medium',
        images,
        site: siteId,
        category: categoryIdFinal || null,
        department: departmentId || null,
        dueDate: finalDueDate,
        clientId: req.user?.clientId,
        userId: req.user?.userId,
        locationId: finalLocationId || null,
        createdGps: {
          latitude: lat,
          longitude: lng,
        },
        platform: platform || 'mobile-android', // Default to mobile-android for mobile API
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
        await logIssueCreationMobile(
          issue._id.toString(),
          req.user?.userId || null,
          req.user?.clientId || null,
          {
            title: fallbackTitle,
            priority: priority || 'medium',
            siteId: siteId?.toString(),
            categoryId: categoryId?.toString(),
            departmentId: department?.toString(),
            imageCount: images.length,
          }
        )
      } catch (logError) {
        console.error('Error logging mobile issue creation:', logError)
        //lsave rror log in db
        try {
          await logError(logError, {
            userId: req.user?.userId,
            clientId: req.user?.clientId,
            metadata: {
              endpoint: 'POST /api/mobile/issues',
              method: 'create-issue-mobile',
            },
          })
        } catch (logErr) {
          console.error('Failed to log error:', logErr)
        }
        // Don't fail the request if logging fails
      }

      const populatedIssue = await Issue.findById(issue._id)
        .populate('site', 'name code')
        .populate('department', 'name')
        .populate('category', 'name')
        .populate('userId', 'name email')

      res.status(201).json(populatedIssue)
    } catch (error) {
      // Log the error to database
      try {
        await logError(error, {
          userId: req.user?.userId,
          clientId: req.user?.clientId,
          metadata: {
            endpoint: 'POST /api/mobile/issues',
            method: 'create-issue-mobile',
            requestBody: {
              siteId: req.body.siteId,
              priority: req.body.priority,
              hasImages: req.files && req.files.length > 0,
              imageCount: req.files?.length || 0,
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

// Update due date only
router.patch('/:id/due-date', protect, [
  body('dueDate').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

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
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: { endpoint: 'PATCH /api/mobile/issues/:id/due-date', method: 'update-due-date-mobile' },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Update category only
router.patch('/:id/category', protect, [
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
      const oldCategory = issue.category
      issue.category = newCategoryId ? new mongoose.Types.ObjectId(newCategoryId) : null
      pushIssueComment(issue, {
        type: 'edit',
        message: `Category updated`,
        userId: req.user?.userId || null,
        payload: { changedFields: ['category'], fieldChanges: { category: { from: oldCategory, to: newCategoryId } } },
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
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: { endpoint: 'PATCH /api/mobile/issues/:id/category', method: 'update-category-mobile' },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Update issue status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

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

    const canAccept = await canUserAcceptOrResolveIssue(issue, req.user)
    if (!canAccept) {
      return res.status(403).json({ 
        message: 'You do not have permission to update this issue' 
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
    // Log the error
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: {
          endpoint: 'PATCH /api/mobile/issues/:id/status',
          method: 'update-status-mobile',
          status: req.body.status,
        },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Resolve issue (mobile-optimized)
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

    const canResolve = await canUserAcceptOrResolveIssue(issue, req.user)
    if (!canResolve) {
      return res.status(403).json({ 
        message: 'You do not have permission to resolve this issue' 
      })
    }

    const resolutionDescription = req.body?.resolutionDescription?.trim() || ''
    const resolutionImageUrl = req.file?.location || ''
    const { latitude, longitude } = req.body

    if (!resolutionDescription && !resolutionImageUrl) {
      return res.status(400).json({ 
        message: 'Please provide a resolution image or description' 
      })
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

    // AI validation (optional, can be disabled for mobile)
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
      // Log AI validation errors
      try {
        await logError(validationError, {
          userId: req.user?.userId,
          clientId: req.user?.clientId,
          issueId: issue._id.toString(),
          metadata: {
            endpoint: 'PATCH /api/mobile/issues/:id/resolve',
            method: 'resolve-issue-mobile',
            errorType: 'AI_VALIDATION_ERROR',
          },
        })
      } catch (logErr) {
        console.error('Failed to log AI validation error:', logErr)
      }
      // Continue without validation for mobile
    }

    // Combine GPS validation with AI validation
    const gpsValid = distance <= 50
    const aiValid = validationResult?.resolved === true

    if (validationResult && !aiValid) {
      // Build comprehensive error message
      let errorMessage = validationResult?.reasoning || 'AI validation could not confirm resolution.'
      
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
    if (validationResult && !gpsValid && aiValid) {
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
    if (validationResult) {
      issue.aiResolutionAnalysis = validationResult
    }
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
    // Log the error
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: {
          endpoint: 'PATCH /api/mobile/issues/:id/resolve',
          method: 'resolve-issue-mobile',
        },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Assign issue to user
router.patch('/:id/assign', protect, [
  body('userId').optional().isMongoId().withMessage('Invalid user ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg })
    }

    const { userId } = req.body

    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    // Only admins can assign
    if (req.user?.role !== 'saas-owner' && 
        req.user?.role !== 'superadmin' && 
        req.user?.role !== 'client') {
      return res.status(403).json({ 
        message: 'You do not have permission to assign issues' 
      })
    }

    let assignedUserName = null
    if (userId) {
      const assignedUser = await User.findOne({
        _id: userId,
        clientId: req.user?.clientId,
      })

      if (!assignedUser) {
        return res.status(404).json({ message: 'User not found' })
      }

      assignedUserName = assignedUser.name
      issue.assignedTo = userId
    } else {
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
    // Log the error
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: {
          endpoint: 'PATCH /api/mobile/issues/:id/assign',
          method: 'assign-issue-mobile',
          assignedUserId: req.body.userId,
        },
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get AI suggestions
router.post('/:id/ai-suggestions', protect, async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' })
    }

    const prompt = `You are an expert technical support assistant. Analyze the following issue and provide 3-5 actionable suggestions for resolution.

Issue Title: ${issue.title}
Description: ${issue.description}
Priority: ${issue.priority}
Status: ${issue.status}

Provide your suggestions as a numbered list, each suggestion should be clear, specific, and actionable.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful technical support assistant that provides clear, actionable solutions.',
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
    
    const suggestions = aiResponse
      .split('\n')
      .filter((line) => /^\d+[\.\)]/.test(line.trim()))
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 0)

    issue.aiSuggestions = suggestions
    await issue.save()

    res.json({
      suggestions,
      analysis: aiResponse,
    })
  } catch (error) {
    // Log AI errors
    try {
      await logError(error, {
        userId: req.user?.userId,
        clientId: req.user?.clientId,
        issueId: req.params.id,
        metadata: {
          endpoint: 'POST /api/mobile/issues/:id/ai-suggestions',
          method: 'ai-suggestions-mobile',
          errorType: 'AI_ERROR',
        },
      })
    } catch (logErr) {
      console.error('Failed to log AI error:', logErr)
    }
    console.error('OpenAI API Error:', error)
    res.status(500).json({ message: 'Failed to get AI suggestions' })
  }
})

module.exports = router

