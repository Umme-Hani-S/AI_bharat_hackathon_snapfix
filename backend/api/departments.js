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

router.put(
  '/:id',
  protect,
  [body('name').trim().notEmpty().withMessage('Team name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { id } = req.params
      const { name, isCompliance } = req.body

      const department = await Department.findOne({
        _id: id,
        clientId: req.user?.clientId,
      })

      if (!department) {
        return res.status(404).json({ message: 'Team not found' })
      }

      if (name && name.trim() !== department.name) {
        const existing = await Department.findOne({
          clientId: req.user?.clientId,
          name: name.trim(),
          _id: { $ne: id },
        })
        if (existing) {
          return res.status(409).json({ message: 'A team with this name already exists' })
        }
        department.name = name.trim()
      }

      if (typeof isCompliance === 'boolean') {
        department.isCompliance = isCompliance
      }

      await department.save()
      res.json(department)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params

    const department = await Department.findOne({
      _id: id,
      clientId: req.user?.clientId,
    })

    if (!department) {
      return res.status(404).json({ message: 'Team not found' })
    }

    const User = require('../src/models/User')
    const usersWithDept = await User.countDocuments({
      clientId: req.user?.clientId,
      departmentIds: id,
    })
    if (usersWithDept > 0) {
      return res.status(400).json({
        message: `Cannot delete team: ${usersWithDept} member(s) are assigned. Remove members first or reassign them.`,
      })
    }

    await Department.deleteOne({ _id: id, clientId: req.user?.clientId })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router


