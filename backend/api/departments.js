const express = require('express')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Department = require('../src/models/Department')
const Issue = require('../src/models/Issue')

const router = express.Router()

// Public endpoint: Get departments by clientId (for public ticket creation)
router.get('/public/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params
    const departments = await Department.find({ clientId })
      .sort({ name: 1 })
      .select('_id name description')
      .lean()
    res.json(departments)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const query = { clientId: req.user?.clientId }
    
    // For field-staff and head-of-staff, only show their assigned departments
    if (req.user?.role === 'field-staff' || req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        query._id = { $in: req.user.departmentIds }
      } else {
        // User has no departments assigned, return empty
        return res.json([])
      }
    }

    const departments = await Department.find(query)
      .sort({ name: 1 })
      .lean()

    res.json(departments)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('Team name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, isCompliance = false } = req.body

      const existing = await Department.findOne({
        clientId: req.user?.clientId,
        name: name.trim(),
      })

      if (existing) {
        return res.status(409).json({ message: 'A team with this name already exists' })
      }

      const department = await Department.create({
        clientId: req.user?.clientId,
        name: name.trim(),
        isCompliance: Boolean(isCompliance),
      })

      res.status(201).json(department)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

module.exports = router


