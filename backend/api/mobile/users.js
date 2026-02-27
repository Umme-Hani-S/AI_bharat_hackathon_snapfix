const express = require('express')
const { protect } = require('../../src/middleware/auth')
const User = require('../../src/models/User')
const { deriveUserRole } = require('../../src/utils/deriveUserRole')

const router = express.Router()

// Get all users (mobile-optimized, for assignment dropdowns)
router.get('/', protect, async (req, res) => {
  try {
    // Only admins, super admins, and client admins can view users
    if (req.user?.role !== 'saas-owner' && 
        req.user?.role !== 'superadmin' && 
        req.user?.role !== 'client') {
      return res.status(403).json({ 
        message: 'You do not have permission to view users' 
      })
    }

    const users = await User.find({ clientId: req.user?.clientId })
      .select('_id name email roles siteIds departmentIds')
      .sort({ name: 1 })
      .lean()

    // Mobile-optimized response
    const formatted = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: deriveUserRole(user),
      roles: user.roles || [],
      siteIds: user.siteIds || [],
      departmentIds: user.departmentIds || [],
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get users by role (for filtering)
router.get('/by-role/:role', protect, async (req, res) => {
  try {
    const { role } = req.params

    if (req.user?.role !== 'saas-owner' && 
        req.user?.role !== 'superadmin' && 
        req.user?.role !== 'client') {
      return res.status(403).json({ 
        message: 'You do not have permission to view users' 
      })
    }

    const users = await User.find({ 
      clientId: req.user?.clientId,
      roles: role,
    })
      .select('_id name email')
      .sort({ name: 1 })
      .lean()

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router

