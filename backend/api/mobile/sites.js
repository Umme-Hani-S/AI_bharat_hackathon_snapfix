const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../../src/middleware/auth')
const Site = require('../../src/models/Site')
const Issue = require('../../src/models/Issue')
const { createGeneralLocationForSite } = require('../../src/utils/locationHelper')

const router = express.Router()

// Get all sites (mobile-optimized)
router.get('/', protect, async (req, res) => {
  try {
    let siteQuery = { clientId: req.user?.clientId }
    let issueQuery = { clientId: req.user?.clientId }

    // For field-staff and head-of-staff, only show sites that have issues in their departments
    if (req.user?.role === 'field-staff' || req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
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
        return res.json([])
      }
    }

    // For vendors, only show sites with assigned issues
    if (req.user?.role === 'vendors') {
      const siteIdsFromIssues = await Issue.distinct('site', {
        clientId: req.user?.clientId,
        assignedTo: req.user?.userId,
      })
      
      if (siteIdsFromIssues.length === 0) {
        return res.json([])
      }
      
      siteQuery._id = { $in: siteIdsFromIssues }
      issueQuery.assignedTo = req.user?.userId
    }

    // For tenants, only show sites with their issues
    if (req.user?.role === 'tenants') {
      const siteIdsFromIssues = await Issue.distinct('site', {
        clientId: req.user?.clientId,
        userId: req.user?.userId,
      })
      
      if (siteIdsFromIssues.length === 0) {
        return res.json([])
      }
      
      siteQuery._id = { $in: siteIdsFromIssues }
      issueQuery.userId = req.user?.userId
    }

    const sites = await Site.find(siteQuery)
      .sort({ name: 1 })
      .lean()

    if (sites.length === 0) {
      return res.json([])
    }

    // Return full site information
    res.json(sites)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get single site
router.get('/:id', protect, async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!site) {
      return res.status(404).json({ message: 'Site not found' })
    }

    res.json(site)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create site
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

      const { name, code, timeZone = 'UTC', latitude, longitude, location, description } = req.body

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
        location: location || '',
        description: description || '',
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

module.exports = router

