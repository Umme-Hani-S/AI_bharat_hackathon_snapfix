const express = require('express')
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Category = require('../src/models/Category')
const Issue = require('../src/models/Issue')

const router = express.Router()

const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

// Public endpoint: Get categories by clientId (for public ticket creation)
router.get('/public/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params
    const categories = await Category.find({ clientId })
      .sort({ name: 1 })
      .select('_id name description')
      .lean()
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    // Get all categories for the client
    const categories = await Category.find({ clientId: req.user?.clientId })
      .sort({ name: 1 })
      .lean()

    if (categories.length === 0) {
      return res.json([])
    }

    const categoryIds = categories.map((category) => category._id)

    // Build issue match query for counting tickets
    const issueMatch = {
      clientId: new mongoose.Types.ObjectId(req.user?.clientId),
      category: { $in: categoryIds },
    }

    // For field-staff and head-of-staff, only count tickets from their departments
    if (req.user?.role === 'field-staff' || req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        issueMatch.department = { $in: req.user.departmentIds.map(id => new mongoose.Types.ObjectId(id)) }
      } else {
        // User has no departments assigned, set all counts to 0
        issueMatch.department = { $in: [] } // This will match nothing
      }
    }

    const counts = await Issue.aggregate([
      {
        $match: issueMatch,
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ])

    const countMap = counts.reduce((acc, entry) => {
      acc[entry._id.toString()] = entry.count
      return acc
    }, {})

    const result = categories.map((category, index) => ({
      _id: category._id,
      name: category.name,
      description: category.description || '',
      ticketCount: countMap[category._id.toString()] || 0,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, description = '' } = req.body

      const existing = await Category.findOne({
        clientId: req.user?.clientId,
        name: name.trim(),
      })

      if (existing) {
        return res.status(409).json({ message: 'Category with this name already exists' })
      }

      const category = await Category.create({
        clientId: req.user?.clientId,
        name: name.trim(),
        description: description.trim(),
      })

      res.status(201).json(category)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

module.exports = router


