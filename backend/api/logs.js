const express = require('express')
const { protect } = require('../src/middleware/auth')
const Log = require('../src/models/Log')

const router = express.Router()

// Get all logs
router.get('/', protect, async (req, res) => {
  try {
    const query = {}
    
    // For SaaS owners, show all logs
    if (req.user?.role === 'saas-owner') {
      // No additional filtering
    }
    // Client admins and super admins see logs within their client
    else if (req.user?.role === 'client' || req.user?.role === 'superadmin') {
      query.clientId = req.user?.clientId
    }
    // Other roles see only their own logs
    else {
      query.userId = req.user?.userId
    }

    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type
    }

    // Filter by level if provided
    if (req.query.level) {
      query.level = req.query.level
    }

    // Date filtering
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {}
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate)
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate)
        endDate.setHours(23, 59, 59, 999)
        query.createdAt.$lte = endDate
      }
    }

    const logs = await Log.find(query)
      .populate('issueId', 'title status priority')
      .populate('userId', 'name email')
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .limit(1000) // Limit to prevent overwhelming response

    res.json(logs)
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get log by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id }
    
    // Apply role-based filtering
    if (req.user?.role !== 'saas-owner') {
      if (req.user?.role === 'client' || req.user?.role === 'superadmin') {
        query.clientId = req.user?.clientId
      } else {
        query.userId = req.user?.userId
      }
    }

    const log = await Log.findOne(query)
      .populate('issueId', 'title status priority description')
      .populate('userId', 'name email')
      .populate('clientId', 'name')

    if (!log) {
      return res.status(404).json({ message: 'Log not found' })
    }

    res.json(log)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router

