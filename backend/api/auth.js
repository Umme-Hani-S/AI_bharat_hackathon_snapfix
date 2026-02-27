const express = require('express')
const { body, validationResult } = require('express-validator')
const User = require('../src/models/User')
const Client = require('../src/models/Client')
const jwt = require('jsonwebtoken')
const { protect } = require('../src/middleware/auth')
const { deriveUserRole } = require('../src/utils/deriveUserRole')

const router = express.Router()

// Generate JWT token with user context
const generateToken = ({ userId, clientId, role }) => {
  const jwtSecret = process.env.JWT_SECRET
  
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is missing in environment variables')
    throw new Error('Server configuration error: JWT_SECRET is required')
  }
  
  return jwt.sign(
    {
      userId,
      clientId: clientId || null,
      role,
    },
    jwtSecret,
    {
      expiresIn: '30d',
      issuer: 'snapfix',
      audience: 'snapfix-users',
    }
  )
}

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { name, email, password } = req.body

      // Check if user exists
      const userExists = await User.findOne({ email })
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' })
      }

      // For registration, clientId should be provided
      // In production, this would come from the registration context
      const { clientId } = req.body

      if (!clientId) {
        return res.status(400).json({ 
          message: 'Client ID is required' 
        })
      }

      // Verify client exists and is active
      const client = await Client.findById(clientId)
      if (!client) {
        return res.status(400).json({ message: 'Invalid client' })
      }

      const roles = Array.isArray(req.body.roles) ? req.body.roles : []
      const siteIds = Array.isArray(req.body.siteIds) ? req.body.siteIds : []
      const departmentIds = Array.isArray(req.body.departmentIds) ? req.body.departmentIds : []
      const isSuperAdmin = Boolean(req.body.isSuperAdmin)
      const isClientAdmin = Boolean(req.body.isClientAdmin)
      const isSaasOwner = Boolean(req.body.isSaasOwner)

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        clientId,
        roles,
        siteIds,
        departmentIds,
        isSuperAdmin,
        isClientAdmin,
        isSaasOwner,
      })

      if (!isSaasOwner && !isClientAdmin) {
        client.users.push(user._id)
        await client.save()
      }

      const role = deriveUserRole(user)

      const token = generateToken({
        userId: user._id.toString(),
        clientId: user.clientId ? user.clientId.toString() : null,
        role,
      })

      res.status(201).json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          clientId: user.clientId.toString(),
          accountType: 'user',
        },
        token,
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      console.log('🔐 Login attempt:', req.body.email)
      
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { email, password } = req.body

      // Authenticate against Users collection only
      const user = await User.findOne({ email }).select('+password')

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const isMatch = await user.comparePassword(password)

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const role = deriveUserRole(user)

      if (role === 'saas-owner') {
        const token = generateToken({
          userId: user._id.toString(),
          clientId: user.clientId ? user.clientId.toString() : null,
          role,
        })

        return res.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role,
            clientId: user.clientId ? user.clientId.toString() : null,
            isSaasOwner: user.isSaasOwner,
            isSuperAdmin: user.isSuperAdmin,
            isClientAdmin: user.isClientAdmin,
          },
          token,
          redirect: '/clients',
        })
      }
     
      if (!user.clientId) {
        return res.status(403).json({
          message: 'User is not associated with any client',
        })
      }

      const client = await Client.findById(user.clientId)

      if (!client) {
        return res.status(403).json({
          message: 'Client not found',
        })
      }

      if (!user.isSaasOwner && client.status !== 'active') {
        return res.status(403).json({
          message: `Client is ${client.status}. Please contact support.`,
        })
      }

      const token = generateToken({
        userId: user._id.toString(),
        clientId: user.clientId ? user.clientId.toString() : null,
        role,
      })

      res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          clientId: user.clientId ? user.clientId.toString() : null,
          isSaasOwner: user.isSaasOwner,
          isSuperAdmin: user.isSuperAdmin,
          isClientAdmin: user.isClientAdmin,
        },
        token,
        redirect: '/',
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Get current user (validate token)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('clientId', 'name companyName status')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const role = deriveUserRole(user)

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role,
      clientId: user.clientId?._id?.toString() || user.clientId?.toString(),
      client: user.clientId,
      accountType: 'user',
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' })
  }
})

// Logout (client-side mainly, but can be used for server-side session invalidation)
router.post('/logout', protect, async (req, res) => {
  // In JWT-based auth, logout is mainly client-side (token removal)
  // For server-side session invalidation, you'd maintain a blacklist
  res.json({ message: 'Logged out successfully' })
})

module.exports = router

