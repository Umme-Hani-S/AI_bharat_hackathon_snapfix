const express = require('express')
const { body, validationResult } = require('express-validator')
const { protect } = require('../../src/middleware/auth')
const Department = require('../../src/models/Department')

const router = express.Router()

// Get all departments (mobile-optimized)
router.get('/', protect, async (req, res) => {
  try {
    const query = { clientId: req.user?.clientId }
    
    // For field-staff and head-of-staff, only show their assigned departments
    if (req.user?.role === 'field-staff' || req.user?.role === 'head-of-staff') {
      if (req.user?.departmentIds && req.user.departmentIds.length > 0) {
        query._id = { $in: req.user.departmentIds }
      } else {
        return res.json([])
      }
    }

    const departments = await Department.find(query)
      .sort({ name: 1 })
      .select('_id name isCompliance')
      .lean()

    // Mobile-optimized response
    const formatted = departments.map((dept) => ({
      _id: dept._id,
      name: dept.name,
      isCompliance: dept.isCompliance || false,
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create department
router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('Department name is required')],
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
        return res.status(409).json({ message: 'A department with this name already exists' })
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

