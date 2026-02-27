const express = require('express')
const mongoose = require('mongoose')
const { protect } = require('../../src/middleware/auth')
const Location = require('../../src/models/Location')

const router = express.Router()

// Get all locations (mobile-optimized)
// Endpoint: GET /api/mobile/location-list
router.get('/location-list', protect, async (req, res) => {
  try {
    let locationQuery = { clientId: req.user?.clientId, enabled: true }

    // For superadmin, isClientAdmin, and saas-owner: show all locations of all sites
    if (
      req.user?.isSaasOwner === true ||
      
      req.user?.isSuperAdmin === true ||
      req.user?.isClientAdmin === true ||
      req.user?.role === 'saas-owner' ||
      req.user?.role === 'superadmin' ||
      req.user?.role === 'client'
    ) {
      // Show all locations for the client - no site filtering needed
      // locationQuery already has clientId, so all locations will be returned
    } else {
      // For other users: show locations based on their assigned sites
      if (req.user?.siteIds && req.user.siteIds.length > 0) {
        // Filter locations by user's assigned sites
        locationQuery.siteId = { $in: req.user.siteIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        // If user has no sites assigned, return empty array
        return res.json([])
      }
    }

    // Filter by siteId if provided in query (overrides above logic)
    if (req.query.siteId) {
      locationQuery.siteId = req.query.siteId
    }

    const locations = await Location.find(locationQuery)
      .populate('siteId', 'name code')
      .sort({ name: 1 })
      .lean()

    if (locations.length === 0) {
      return res.json([])
    }

    // Mobile-optimized response with all location details
    const formatted = locations.map((location) => ({
      _id: location._id,
      name: location.name,
      locationCode: location.locationCode || null,
      shortCode: location.shortCode || null,
      siteId: location.siteId?._id || null,
      siteName: location.siteId?.name || null,
      siteCode: location.siteId?.code || null,
      area: location.area || null,
      city: location.city || null,
      address: location.address || null,
      timeZone: location.timeZone || 'UTC',
      enabled: location.enabled !== undefined ? location.enabled : true,
      // GeoJSON location data
      location: location.loc ? {
        type: location.loc.type || 'Point',
        coordinates: location.loc.coordinates || [0, 0], // [longitude, latitude]
        latitude: location.loc.coordinates?.[1] || null,
        longitude: location.loc.coordinates?.[0] || null,
      } : null,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    }))

    res.json(formatted)
  } catch (error) {
    console.error('Error fetching locations for mobile:', error)
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router

