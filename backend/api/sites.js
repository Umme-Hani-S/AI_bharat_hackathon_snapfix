const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Site = require('../src/models/Site')
const Issue = require('../src/models/Issue')
const { createGeneralLocationForSite } = require('../src/utils/locationHelper')

const router = express.Router()

const formatAvgHours = (totalMs, count) => {
  if (!count || !totalMs) return '—'
  const hours = totalMs / count / (1000 * 60 * 60)
  if (!Number.isFinite(hours)) return '—'
  return `${hours.toFixed(1)}h`
}

router.get('/', protect, async (req, res) => {
  try {
    // Build base query
    let siteQuery = { clientId: req.user?.clientId }
    let issueQuery = { clientId: req.user?.clientId }

    // For field-staff and head-of-staff, only show sites that have issues in their departments
    if (req.user?.role === 'field-staff' || req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        // First, get sites from issues assigned to user's departments
        const siteIdsFromIssues = await Issue.distinct('site', {
          clientId: req.user?.clientId,
          department: { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) },
        })
        
        if (siteIdsFromIssues.length === 0) {
          return res.json([])
        }
        
        siteQuery._id = { $in: siteIdsFromIssues }
        issueQuery.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        // User has no departments assigned, return empty
        return res.json([])
      }
    }

    const sites = await Site.find(siteQuery)
      .sort({ createdAt: -1 })
      .lean()

    if (sites.length === 0) {
      return res.json([])
    }

    const siteIds = sites.map((site) => site._id)

    issueQuery.site = { $in: siteIds }

    const issues = await Issue.find(issueQuery)
      .select('site status priority createdAt resolutionTime')
      .lean()

    const statsMap = {}

    for (const issue of issues) {
      const key = issue.site?.toString()
      if (!key) continue

      if (!statsMap[key]) {
        statsMap[key] = {
          open: 0,
          atRisk: 0,
          resolved: 0,
          totalResolutionMs: 0,
          resolvedCount: 0,
        }
      }

      const stat = statsMap[key]

      if (issue.status === 'resolved' || issue.status === 'closed') {
        stat.resolved += 1
        if (issue.resolutionTime) {
          const createdAt = new Date(issue.createdAt).getTime()
          const resolvedAt = new Date(issue.resolutionTime).getTime()
          if (!Number.isNaN(createdAt) && !Number.isNaN(resolvedAt) && resolvedAt >= createdAt) {
            stat.totalResolutionMs += resolvedAt - createdAt
            stat.resolvedCount += 1
          }
        }
      } else {
        stat.open += 1
      }

      if (issue.priority === 'critical' && issue.status !== 'resolved' && issue.status !== 'closed') {
        stat.atRisk += 1
      }
    }

    const formatted = sites.map((site) => {
      const stat = statsMap[site._id.toString()] || {
        open: 0,
        atRisk: 0,
        resolved: 0,
        totalResolutionMs: 0,
        resolvedCount: 0,
      }

      return {
        _id: site._id,
        name: site.name,
        code: site.code || site.name?.slice(0, 2)?.toUpperCase() || 'NA',
        location: site.location || site.timeZone || 'N/A',
        description: site.description || '',
        timeZone: site.timeZone || 'UTC',
        latitude: site.latitude,
        longitude: site.longitude,
        openTickets: stat.open,
        atRiskTickets: stat.atRisk,
        resolvedTickets: stat.resolved,
        avgResolutionTime: formatAvgHours(stat.totalResolutionMs, stat.resolvedCount),
      }
    })

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('Site name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const {
        name,
        code,
        timeZone = 'UTC',
        latitude,
        longitude,
        enabled = true,
        enableSms = false,
        enableGps = false,
      } = req.body

      const existing = await Site.findOne({
        clientId: req.user?.clientId,
        name: name.trim(),
      })

      if (existing) {
        return res.status(409).json({ message: 'A site with this name already exists' })
      }

      // Validate latitude and longitude if provided
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ message: 'Latitude must be between -90 and 90' })
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ message: 'Longitude must be between -180 and 180' })
      }

      const site = await Site.create({
        clientId: req.user?.clientId,
        name: name.trim(),
        code: code?.trim() || undefined,
        timeZone: timeZone || 'UTC',
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        enabled: Boolean(enabled),
        enableSms: Boolean(enableSms),
        enableGps: Boolean(enableGps),
      })

      // Automatically create a general location for the new site
      try {
        await createGeneralLocationForSite(site)
      } catch (locationError) {
        console.error('Failed to create general location for site:', locationError)
        // Don't fail site creation if location creation fails
      }

      res.status(201).json(site)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Get single site
router.get('/:id', protect, async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    }).lean()

    if (!site) {
      return res.status(404).json({ message: 'Site not found' })
    }

    res.json(site)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Update site
router.put(
  '/:id',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Site name cannot be empty'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const site = await Site.findOne({
        _id: req.params.id,
        clientId: req.user?.clientId,
      })

      if (!site) {
        return res.status(404).json({ message: 'Site not found' })
      }

      const {
        name,
        code,
        timeZone,
        latitude,
        longitude,
        enabled,
        enableSms,
        enableGps,
      } = req.body

      // Check for duplicate name if name is being changed
      if (name && name.trim() !== site.name) {
        const existing = await Site.findOne({
          clientId: req.user?.clientId,
          name: name.trim(),
          _id: { $ne: req.params.id },
        })

        if (existing) {
          return res.status(409).json({ message: 'A site with this name already exists' })
        }
      }

      // Validate latitude and longitude if provided
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ message: 'Latitude must be between -90 and 90' })
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ message: 'Longitude must be between -180 and 180' })
      }

      // Update site
      if (name !== undefined) site.name = name.trim()
      if (code !== undefined) site.code = code?.trim() || undefined
      if (timeZone !== undefined) site.timeZone = timeZone || 'UTC'
      if (latitude !== undefined) site.latitude = latitude !== null ? parseFloat(latitude) : undefined
      if (longitude !== undefined) site.longitude = longitude !== null ? parseFloat(longitude) : undefined
      if (enabled !== undefined) site.enabled = Boolean(enabled)
      if (enableSms !== undefined) site.enableSms = Boolean(enableSms)
      if (enableGps !== undefined) site.enableGps = Boolean(enableGps)

      await site.save()

      res.json(site)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Delete site
router.delete('/:id', protect, async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!site) {
      return res.status(404).json({ message: 'Site not found' })
    }

    // Check if site has associated issues
    const issueCount = await Issue.countDocuments({ site: req.params.id })
    if (issueCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete site. It has ${issueCount} associated issue(s). Please resolve or reassign issues first.` 
      })
    }

    await Site.deleteOne({ _id: req.params.id })

    res.json({ message: 'Site deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router


