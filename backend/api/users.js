const express = require('express')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const User = require('../src/models/User')
const Department = require('../src/models/Department')

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find({ clientId: req.user?.clientId })
      // .select('name email isSuperAdmin isClientAdmin departmentRoles team activeTickets createdAt')
      .sort({ createdAt: -1 })
      .lean()

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

const validateUserAccess = [
  body('roles')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Roles must be an array'),
  body('roles.*')
    .optional()
    .isIn(['head-of-staff', 'field-staff', 'tenants', 'vendors'])
    .withMessage('Role must be head-of-staff, field-staff, tenants, or vendors'),
  body('siteIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Site IDs must be an array'),
  body('departmentIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Department IDs must be an array'),
]

router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ...validateUserAccess,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, email, password, isSuperAdmin = false, roles = [], siteIds = [], departmentIds = [] } = req.body

      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' })
      }

      // Ensure sites and departments belong to this client
      if (siteIds.length > 0) {
        const Site = require('../src/models/Site')
        const validSites = await Site.countDocuments({
          _id: { $in: siteIds },
          clientId: req.user?.clientId,
        })

        if (validSites !== siteIds.length) {
          return res.status(400).json({ message: 'Invalid site selection' })
        }
      }

      if (departmentIds.length > 0) {
        const validDepartments = await Department.countDocuments({
          _id: { $in: departmentIds },
          clientId: req.user?.clientId,
        })

        if (validDepartments !== departmentIds.length) {
          return res.status(400).json({ message: 'Invalid department selection' })
        }
      }

      const user = await User.create({
        name,
        email,
        password,
        isSuperAdmin,
        roles: isSuperAdmin ? [] : roles,
        siteIds,
        departmentIds,
        clientId: req.user?.clientId,
      })

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        isClientAdmin: user.isClientAdmin,
        roles: user.roles,
        siteIds: user.siteIds,
        departmentIds: user.departmentIds,
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

router.put(
  '/:id',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ...validateUserAccess,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, email, password, isSuperAdmin = false, roles = [], siteIds = [], departmentIds = [] } = req.body

      const user = await User.findOne({
        _id: req.params.id,
        clientId: req.user?.clientId,
      }).select('+password')

      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      if (email !== user.email) {
        const emailExists = await User.findOne({ email })
        if (emailExists) {
          return res.status(400).json({ message: 'A user with this email already exists' })
        }
      }

      if (!isSuperAdmin && (!Array.isArray(roles) || roles.length === 0)) {
        return res.status(400).json({ message: 'Assign at least one role' })
      }

      // Validate sites and departments belong to this client
      if (siteIds.length > 0) {
        const Site = require('../src/models/Site')
        const validSites = await Site.countDocuments({
          _id: { $in: siteIds },
          clientId: req.user?.clientId,
        })

        if (validSites !== siteIds.length) {
          return res.status(400).json({ message: 'Invalid site selection' })
        }
      }

      if (departmentIds.length > 0) {
        const validDepartments = await Department.countDocuments({
          _id: { $in: departmentIds },
          clientId: req.user?.clientId,
        })

        if (validDepartments !== departmentIds.length) {
          return res.status(400).json({ message: 'Invalid department selection' })
        }
      }

      user.name = name
      user.email = email
      user.isSuperAdmin = isSuperAdmin
      user.roles = isSuperAdmin ? [] : roles
      user.siteIds = siteIds
      user.departmentIds = departmentIds

      if (password) {
        user.password = password
      }

      await user.save()

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        isClientAdmin: user.isClientAdmin,
        roles: user.roles,
        siteIds: user.siteIds,
        departmentIds: user.departmentIds,
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

module.exports = router


