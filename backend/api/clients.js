const express = require('express')
const { body, validationResult } = require('express-validator')
const { protect } = require('../src/middleware/auth')
const Client = require('../src/models/Client')
const User = require('../src/models/User')
const Department = require('../src/models/Department')
const { deriveUserRole } = require('../src/utils/deriveUserRole')

const router = express.Router()

// Middleware to check if user is SaaS owner or superadmin
const isSaaSAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.userId || req.user?.id)
    if (!user) {
      return res.status(403).json({ message: 'Access denied. User not found.' })
    }
    
    const userRole = deriveUserRole(user)

    // Check if user is SaaS owner or superadmin
    if (userRole !== 'saas-owner' && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. SaaS owner or superadmin only.' })
    }

    next()
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// Get all clients (SaaS owner/superadmin only)
router.get('/', protect, isSaaSAdmin, async (req, res) => {
  try {
    const { status, search } = req.query
    
    const query = {}
    
    if (status) {
      query.status = status
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ]
    }
    
    const clients = await Client.find(query)
      .populate('sites', 'name code')
      .populate('users', 'name email isSuperAdmin isClientAdmin isSaasOwner roles siteIds departmentIds')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
    
    res.json(clients)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get single client (SaaS owner/superadmin only)
router.get('/:id', protect, isSaaSAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('sites')
      .populate('users', 'name email isSuperAdmin isClientAdmin isSaasOwner departmentRoles team')
      .populate('createdBy', 'name email')
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }
    
    res.json(client)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Create new client (SaaS owner/superadmin only)
router.post(
  '/',
  protect,
  isSaaSAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const {
        name,
        email,
        phone,
        companyName,
        address,
        status,
        subscriptionTier,
        password,
      } = req.body

      // Check if client with email already exists
      const existingClient = await Client.findOne({ email })
      if (existingClient) {
        return res.status(400).json({ message: 'Client with this email already exists' })
      }

      // Ensure no user already exists with this email
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' })
      }

      const client = await Client.create({
        name,
        email,
        phone,
        companyName,
        address,
        status: status || 'active',
        subscriptionTier: subscriptionTier || 'basic',
        createdBy: req.user?.userId,
      })

      let clientAdmin
      try {
        clientAdmin = await User.create({
          name,
          email,
          password,
          isClientAdmin: true,
          isSuperAdmin: false,
          isSaasOwner: false,
          clientId: client._id,
        })
      } catch (userError) {
        await Client.findByIdAndDelete(client._id)
        throw userError
      }

      try {
        await Department.create({
          clientId: client._id,
          name: 'General',
          enabled: true,
        })
      } catch (departmentError) {
        await User.findByIdAndDelete(clientAdmin._id)
        await Client.findByIdAndDelete(client._id)
        throw departmentError
      }

      await client.save()

      const populatedClient = await Client.findById(client._id)
        .populate('users', 'name email isClientAdmin isSuperAdmin')
        .populate('createdBy', 'name email')

      res.status(201).json(populatedClient)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Update client (SaaS owner/superadmin only)
router.put(
  '/:id',
  protect,
  isSaaSAdmin,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const {
        name,
        email,
        phone,
        companyName,
        address,
        status,
        subscriptionTier,
        password,
      } = req.body

      if (email) {
        const existingClient = await Client.findOne({
          email,
          _id: { $ne: req.params.id },
        })
        if (existingClient) {
          return res.status(400).json({ message: 'Client with this email already exists' })
        }
      }

      const client = await Client.findByIdAndUpdate(
        req.params.id,
        {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
          ...(companyName && { companyName }),
          ...(address && { address }),
          ...(status && { status }),
          ...(subscriptionTier && { subscriptionTier }),
        },
        { new: true, runValidators: true }
      )
        .populate('sites', 'name code')
        .populate('users', 'name email isClientAdmin')
        .populate('createdBy', 'name email')

      if (!client) {
        return res.status(404).json({ message: 'Client not found' })
      }

      if (password) {
        const clientAdmin = await User.findOne({
          clientId: client._id,
          isClientAdmin: true,
        }).select('+password')

        if (clientAdmin) {
          clientAdmin.password = password
          await clientAdmin.save()
        }
      }

      res.json(client)
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Delete client (SaaS owner/superadmin only)
router.delete('/:id', protect, isSaaSAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Check if client has sites or users
    if (client.sites.length > 0 || client.users.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete client with associated sites or users. Please remove them first.' 
      })
    }

    await Client.findByIdAndDelete(req.params.id)
    
    res.json({ message: 'Client deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Get client statistics (SaaS owner/superadmin only)
router.get('/:id/stats', protect, isSaaSAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('sites')
      .populate('users')
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const Issue = require('../src/models/Issue')
    
    const userIds = client.users.map(u => u._id)
    
    const totalTickets = await Issue.countDocuments({
      userId: { $in: userIds }
    })
    
    const openTickets = await Issue.countDocuments({
      userId: { $in: userIds },
      status: 'open'
    })

    const resolvedTickets = await Issue.countDocuments({
      userId: { $in: userIds },
      status: { $in: ['resolved', 'closed'] }
    })

    res.json({
      totalSites: client.sites.length,
      totalUsers: client.users.length,
      totalTickets,
      openTickets,
      resolvedTickets,
      subscriptionTier: client.subscriptionTier,
      status: client.status,
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

module.exports = router


