const express = require('express')
const { body, validationResult } = require('express-validator')
const mongoose = require('mongoose')
const User = require('../../src/models/User')
const Client = require('../../src/models/Client')
const Site = require('../../src/models/Site')
const Location = require('../../src/models/Location')
const jwt = require('jsonwebtoken')
const { protect } = require('../../src/middleware/auth')
const { deriveUserRole } = require('../../src/utils/deriveUserRole')

const router = express.Router()

// Generate JWT token with user context
const generateToken = ({ userId, clientId, role }) => {
  const jwtSecret = process.env.JWT_SECRET
  
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is missing in environment variables')
    throw new Error('Server configuration error: JWT_SECRET is required')
  }
  
  return jwt.sign(
    {
      userId,
      clientId: clientId || null,
      role,
    },
    jwtSecret,
    {
      expiresIn: '30d',
      issuer: 'snapfix',
      audience: 'snapfix-users',
    }
  )
}

// Mobile Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { email, password } = req.body

      const user = await User.findOne({ email }).select('+password')

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const isMatch = await user.comparePassword(password)

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const role = deriveUserRole(user)

      if (!user.clientId) {
        return res.status(403).json({
          message: 'User is not associated with any client',
        })
      }

      const client = await Client.findById(user.clientId)

      if (!client) {
        return res.status(403).json({
          message: 'Client not found',
        })
      }

      if (!user.isSaasOwner && client.status !== 'active') {
        return res.status(403).json({
          message: `Client is ${client.status}. Please contact support.`,
        })
      }

      const token = generateToken({
        userId: user._id.toString(),
        clientId: user.clientId.toString(),
        role,
      })

      // Fetch sites based on user's access
      // For admin roles (saas-owner, superadmin, client admin): show ALL sites for the client
      const isAdmin = (
        user.isSaasOwner === true ||
        user.isSuperAdmin === true ||
        user.isClientAdmin === true ||
        role === 'saas-owner' ||
        role === 'superadmin' ||
        role === 'client'
      )
      
      // console.log('Login - User admin check:', {
      //   userId: user._id.toString(),
      //   isSaasOwner: user.isSaasOwner,
      //   isSuperAdmin: user.isSuperAdmin,
      //   isClientAdmin: user.isClientAdmin,
      //   role,
      //   isAdmin
      // })

      // Build sites query - admin users get ALL enabled sites for their client
      let sitesQuery = { clientId: user.clientId, enabled: true }
      
      // For non-admin users: filter by their assigned sites
      if (!isAdmin) {
        if (user.siteIds && user.siteIds.length > 0) {
          sitesQuery._id = { $in: user.siteIds.map(id => new mongoose.Types.ObjectId(id)) }
        } else {
          // If user has no sites assigned, return empty array
          sitesQuery._id = { $in: [] } // This will return no results
        }
      }
      // For admin roles: sitesQuery has clientId and enabled=true, so all enabled sites for the client are returned

      // console.log('Login - Sites query:', JSON.stringify(sitesQuery, null, 2))
      const sites = await Site.find(sitesQuery)
        .select('_id name code timeZone latitude longitude enabled')
        .sort({ name: 1 })
        .lean()
      // console.log('Login - Sites found:', sites.length)

      // Build locations query - admin users get ALL enabled locations for their client
      let locationQuery = { clientId: user.clientId, enabled: true }

      // For non-admin users: filter by their assigned sites
      if (!isAdmin) {
        if (user.siteIds && user.siteIds.length > 0) {
          locationQuery.siteId = { $in: user.siteIds.map(id => new mongoose.Types.ObjectId(id)) }
        } else {
          // If user has no sites assigned, return empty array
          locationQuery.siteId = { $in: [] } // This will return no results
        }
      }
      // For admin roles: locationQuery has clientId and enabled=true, so all enabled locations for the client are returned

      // console.log('Login - Locations query:', JSON.stringify(locationQuery, null, 2))
      const locations = await Location.find(locationQuery)
        .populate('siteId', 'name code')
        .sort({ name: 1 })
        .lean()
      console.log('Login - Locations found:', locations.length)

      // Format sites for mobile response
      const formattedSites = sites.map((site) => ({
        _id: site._id.toString(),
        name: site.name,
        code: site.code || null,
        timeZone: site.timeZone || 'UTC',
        latitude: site.latitude || null,
        longitude: site.longitude || null,
        enabled: site.enabled !== undefined ? site.enabled : true,
      }))

      // Format locations for mobile response
      const formattedLocations = locations.map((location) => ({
        _id: location._id.toString(),
        name: location.name,
        locationCode: location.locationCode || null,
        shortCode: location.shortCode || null,
        siteId: location.siteId?._id?.toString() || location.siteId?.toString() || null,
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
      }))

      // Mobile-optimized response
      res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          clientId: user.clientId.toString(),
          isSaasOwner: user.isSaasOwner,
          isSuperAdmin: user.isSuperAdmin,
          isClientAdmin: user.isClientAdmin,
          roles: user.roles || [],
          siteIds: user.siteIds || [],
          departmentIds: user.departmentIds || [],
        },
        token,
        sites: formattedSites,
        locations: formattedLocations,
        permissions: {
          role,
          roles: user.roles || [],
          isSaasOwner: user.isSaasOwner,
          isSuperAdmin: user.isSuperAdmin,
          isClientAdmin: user.isClientAdmin,
        },
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Mobile Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, email, password, clientId, roles = [], siteIds = [], departmentIds = [] } = req.body

      const userExists = await User.findOne({ email })
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' })
      }

      if (!clientId) {
        return res.status(400).json({ 
          message: 'Client ID is required' 
        })
      }

      const client = await Client.findById(clientId)
      if (!client) {
        return res.status(400).json({ message: 'Invalid client' })
      }

      const user = await User.create({
        name,
        email,
        password,
        clientId,
        roles: Array.isArray(roles) ? roles : [],
        siteIds: Array.isArray(siteIds) ? siteIds : [],
        departmentIds: Array.isArray(departmentIds) ? departmentIds : [],
      })

      if (!user.isSaasOwner && !user.isClientAdmin) {
        client.users.push(user._id)
        await client.save()
      }

      const role = deriveUserRole(user)
      const token = generateToken({
        userId: user._id.toString(),
        clientId: user.clientId.toString(),
        role,
      })

      res.status(201).json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          clientId: user.clientId.toString(),
          roles: user.roles || [],
          siteIds: user.siteIds || [],
          departmentIds: user.departmentIds || [],
        },
        token,
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Get current user (mobile-optimized)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('clientId', 'name companyName status')
      .populate('siteIds', 'name code')
      .populate('departmentIds', 'name')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const role = deriveUserRole(user)

    // Mobile-optimized response with essential data only
    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role,
      clientId: user.clientId?._id?.toString() || user.clientId?.toString(),
      client: {
        id: user.clientId?._id?.toString(),
        name: user.clientId?.name,
        companyName: user.clientId?.companyName,
      },
      isSaasOwner: user.isSaasOwner,
      isSuperAdmin: user.isSuperAdmin,
      isClientAdmin: user.isClientAdmin,
      roles: user.roles || [],
      sites: user.siteIds || [],
      departments: user.departmentIds || [],
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Logout
router.post('/logout', protect, async (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

module.exports = router

