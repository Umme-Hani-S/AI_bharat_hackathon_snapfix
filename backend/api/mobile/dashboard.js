const express = require('express')
const mongoose = require('mongoose')
const { protect } = require('../../src/middleware/auth')
const Issue = require('../../src/models/Issue')
const Site = require('../../src/models/Site')
const Category = require('../../src/models/Category')
const Department = require('../../src/models/Department')

const router = express.Router()

// Get dashboard stats (mobile-optimized)
router.get('/stats', protect, async (req, res) => {
  try {
    const baseQuery = { clientId: req.user?.clientId }
    let issueQuery = { ...baseQuery }

    // Apply role-based filtering
    if (req.user?.role === 'field-staff') {
      issueQuery.userId = req.user?.userId
    } else if (req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        issueQuery.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        return res.json({
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
        })
      }
    } else if (req.user?.role === 'vendors') {
      issueQuery.assignedTo = req.user?.userId
    } else if (req.user?.role === 'tenants') {
      issueQuery.userId = req.user?.userId
    }

    // Get issue counts
    const total = await Issue.countDocuments(issueQuery)
    const open = await Issue.countDocuments({ ...issueQuery, status: 'open' })
    const inProgress = await Issue.countDocuments({ ...issueQuery, status: 'in-progress' })
    const resolved = await Issue.countDocuments({ ...issueQuery, status: 'resolved' })
    const closed = await Issue.countDocuments({ ...issueQuery, status: 'closed' })

    // Get priority breakdown
    const priorityCounts = await Issue.aggregate([
      { $match: issueQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ])

    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    priorityCounts.forEach((item) => {
      if (byPriority.hasOwnProperty(item._id)) {
        byPriority[item._id] = item.count
      }
    })

    // Get recent issues count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = await Issue.countDocuments({
      ...issueQuery,
      createdAt: { $gte: sevenDaysAgo },
    })

    res.json({
      total,
      open,
      inProgress,
      resolved,
      closed,
      recent,
      byPriority,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get quick stats (lighter payload)
router.get('/quick', protect, async (req, res) => {
  try {
    let issueQuery = { clientId: req.user?.clientId }

    if (req.user?.role === 'field-staff') {
      issueQuery.userId = req.user?.userId
    } else if (req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        issueQuery.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        return res.json({ open: 0, assigned: 0 })
      }
    } else if (req.user?.role === 'vendors') {
      issueQuery.assignedTo = req.user?.userId
    } else if (req.user?.role === 'tenants') {
      issueQuery.userId = req.user?.userId
    }

    const open = await Issue.countDocuments({ ...issueQuery, status: { $in: ['open', 'in-progress'] } })
    
    let assigned = 0
    if (req.user?.role === 'vendors' || req.user?.role === 'field-staff') {
      assigned = await Issue.countDocuments({ ...issueQuery, assignedTo: req.user?.userId })
    }

    res.json({
      open,
      assigned,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router

