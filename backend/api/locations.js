const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Location = require('../src/models/Location')

const router = express.Router()

// Public endpoint: Get location by code (for QR scanning)
router.get('/public/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params
    
    // Build query - only include _id if code is a valid ObjectId
    const queryConditions = [
      { locationCode: code },
      { shortCode: code },
    ]
    
    // Only add _id lookup if code is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(code) && code.length === 24) {
      queryConditions.push({ _id: code })
    }
    
    const location = await Location.findOne({
      $or: queryConditions,
    })
      .populate('siteId', 'name code clientId')
      .lean()

    if (!location) {
      return res.status(404).json({ message: 'Location not found' })
    }

    const clientId = location.clientId || location.siteId?.clientId

    // Return location with site info and clientId for fetching categories/departments
    res.json({
      location: {
        _id: location._id,
        name: location.name,
        locationCode: location.locationCode,
        shortCode: location.shortCode,
        address: location.address,
        siteId: location.siteId?._id,
        siteName: location.siteId?.name,
        clientId: clientId,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get all locations (optionally filtered by siteId)
router.get('/', protect, async (req, res) => {
  try {
    const query = { clientId: req.user?.clientId }
    
    // Filter by siteId if provided
    if (req.query.siteId) {
      query.siteId = req.query.siteId
    }

    const locations = await Location.find(query)
      .populate('siteId', 'name code')
      .sort({ createdAt: -1 })
      .lean()

    res.json(locations)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get single location
router.get('/:id', protect, async (req, res) => {
  try {
    const location = await Location.findOne({
      _id: req.params.id,
      clientId: req.user?.clientId,
    }).lean()

    if (!location) {
      return res.status(404).json({ message: 'Location not found' })
    }

    res.json(location)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create location
router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Location name is required'),
    body('siteId').notEmpty().withMessage('Site ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const {
        name,
        siteId,
        locationCode,
        shortCode,
        area,
        city,
        address,
        timeZone = 'UTC',
        latitude,
        longitude,
        locType = 'Point',
        enabled = true,
      } = req.body

      if (!siteId) {
        return res.status(400).json({ message: 'Site ID is required' })
      }

      // Verify site belongs to client
      const Site = require('../src/models/Site')
      const site = await Site.findOne({
        _id: siteId,
        clientId: req.user?.clientId,
      })

      if (!site) {
        return res.status(400).json({ message: 'Invalid site or site does not belong to your client' })
      }

      const existing = await Location.findOne({
        clientId: req.user?.clientId,
        siteId: siteId,
        name: name.trim(),
      })

      if (existing) {
        return res.status(409).json({ message: 'A location with this name already exists for this site' })
      }

      // Validate shortCode uniqueness if provided
      if (shortCode) {
        const existingShortCode = await Location.findOne({
          clientId: req.user?.clientId,
          shortCode: shortCode.trim(),
        })
        if (existingShortCode) {
          return res.status(409).json({ message: 'A location with this short code already exists' })
        }
      }

      // Build GeoJSON loc object
      let loc = { type: locType, coordinates: [0, 0] }
      if (latitude !== undefined && longitude !== undefined) {
        // Validate coordinates
        if (latitude < -90 || latitude > 90) {
          return res.status(400).json({ message: 'Latitude must be between -90 and 90' })
        }
        if (longitude < -180 || longitude > 180) {
          return res.status(400).json({ message: 'Longitude must be between -180 and 180' })
        }
        // GeoJSON format: [longitude, latitude]
        loc.coordinates = [parseFloat(longitude), parseFloat(latitude)]
      }

      const location = await Location.create({
        clientId: req.user?.clientId,
        siteId: siteId,
        name: name.trim(),
        locationCode: locationCode?.trim() || undefined,
        shortCode: shortCode?.trim() || undefined,
        area: area?.trim() || undefined,
        city: city?.trim() || undefined,
        address: address?.trim() || undefined,
        timeZone: timeZone || 'UTC',
        loc: loc,
        enabled: Boolean(enabled),
      })

      res.status(201).json(location)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Update location
router.put(
  '/:id',
  protect,
  [body('name').optional().trim().notEmpty().withMessage('Location name cannot be empty')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const location = await Location.findOne({
        _id: req.params.id,
        clientId: req.user?.clientId,
      })

      if (!location) {
        return res.status(404).json({ message: 'Location not found' })
      }

      const {
        name,
        siteId,
        locationCode,
        shortCode,
        area,
        city,
        address,
        timeZone,
        latitude,
        longitude,
        locType,
        enabled,
      } = req.body

      if (name !== undefined) location.name = name.trim()
      if (siteId !== undefined) location.siteId = siteId || null
      if (locationCode !== undefined) location.locationCode = locationCode?.trim() || undefined
      if (shortCode !== undefined) {
        const trimmedShortCode = shortCode?.trim() || undefined
        if (trimmedShortCode) {
          // Validate shortCode uniqueness if changing
          const existingShortCode = await Location.findOne({
            clientId: req.user?.clientId,
            shortCode: trimmedShortCode,
            _id: { $ne: req.params.id },
          })
          if (existingShortCode) {
            return res.status(409).json({ message: 'A location with this short code already exists' })
          }
        }
        location.shortCode = trimmedShortCode
      }
      if (area !== undefined) location.area = area?.trim() || undefined
      if (city !== undefined) location.city = city?.trim() || undefined
      if (address !== undefined) location.address = address?.trim() || undefined
      if (timeZone !== undefined) location.timeZone = timeZone

      // Update GeoJSON loc if coordinates provided
      if (latitude !== undefined || longitude !== undefined) {
        const lat = latitude !== undefined ? parseFloat(latitude) : (location.loc?.coordinates[1] || 0)
        const lng = longitude !== undefined ? parseFloat(longitude) : (location.loc?.coordinates[0] || 0)
        
        // Validate coordinates
        if (lat < -90 || lat > 90) {
          return res.status(400).json({ message: 'Latitude must be between -90 and 90' })
        }
        if (lng < -180 || lng > 180) {
          return res.status(400).json({ message: 'Longitude must be between -180 and 180' })
        }
        
        location.loc = {
          type: locType || location.loc?.type || 'Point',
          coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
        }
      }
      
      if (enabled !== undefined) location.enabled = Boolean(enabled)

      await location.save()

      res.json(location)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Delete location
router.delete('/:id', protect, async (req, res) => {
  try {
    const location = await Location.findOneAndDelete({
      _id: req.params.id,
      clientId: req.user?.clientId,
    })

    if (!location) {
      return res.status(404).json({ message: 'Location not found' })
    }

    res.json({ message: 'Location deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router

