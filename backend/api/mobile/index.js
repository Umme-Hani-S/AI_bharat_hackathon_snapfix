const express = require('express')
const deviceRoutes = require('./device')
const notificationRoutes = require('./notifications')
const authRoutes = require('./auth')
const issueRoutes = require('./issues')
const categoryRoutes = require('./categories')
const siteRoutes = require('./sites')
const departmentRoutes = require('./departments')
const userRoutes = require('./users')
const dashboardRoutes = require('./dashboard')
const locationRoutes = require('./locations')

const router = express.Router()

// Mobile API routes
router.use('/device', deviceRoutes)
router.use('/notifications', notificationRoutes)
router.use('/auth', authRoutes)
router.use('/issues', issueRoutes)
router.use('/categories', categoryRoutes)
router.use('/sites', siteRoutes)
router.use('/departments', departmentRoutes)
router.use('/users', userRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/', locationRoutes)

// Health check for mobile API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mobile-api',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/mobile/auth',
      issues: '/api/mobile/issues',
      categories: '/api/mobile/categories',
      sites: '/api/mobile/sites',
      departments: '/api/mobile/departments',
      users: '/api/mobile/users',
      dashboard: '/api/mobile/dashboard',
      device: '/api/mobile/device',
      notifications: '/api/mobile/notifications',
      locations: '/api/mobile/location-list',
    }
  })
})

module.exports = router

