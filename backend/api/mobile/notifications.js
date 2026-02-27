const express = require('express')
const { protect } = require('../../src/middleware/auth')
const Issue = require('../../src/models/Issue')
const User = require('../../src/models/User')

const router = express.Router()

// Get user notifications
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user?.userId
    const { limit = 50, offset = 0 } = req.query

    // Get issues assigned to user or in their departments
    const user = await User.findById(userId).lean()
    
    const query = {
      clientId: req.user?.clientId,
      $or: [
        { assignedTo: userId },
        { userId: userId }, // Issues created by user
      ],
    }

    // Add department filter if user has departments
    if (user?.departmentIds && user.departmentIds.length > 0) {
      query.$or.push({ department: { $in: user.departmentIds } })
    }

    const issues = await Issue.find(query)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('site', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .lean()

    // Format as notifications
    const notifications = issues.map((issue) => ({
      id: issue._id,
      type: 'issue',
      title: issue.title || 'Issue Update',
      message: getNotificationMessage(issue, userId),
      data: {
        issueId: issue._id,
        status: issue.status,
        priority: issue.priority,
      },
      createdAt: issue.updatedAt,
      read: false, // You can add a read status field later
    }))

    res.json({
      notifications,
      total: notifications.length,
      hasMore: issues.length === parseInt(limit),
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Mark notification as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    // In a full implementation, you'd have a Notification model
    // For now, this is a placeholder
    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Helper function to generate notification message
function getNotificationMessage(issue, userId) {
  if (issue.assignedTo?._id?.toString() === userId) {
    return `Issue "${issue.title || 'Untitled'}" has been assigned to you`
  }
  if (issue.status === 'resolved') {
    return `Issue "${issue.title || 'Untitled'}" has been resolved`
  }
  if (issue.status === 'in-progress') {
    return `Issue "${issue.title || 'Untitled'}" is now in progress`
  }
  return `Update on issue "${issue.title || 'Untitled'}"`
}

module.exports = router

