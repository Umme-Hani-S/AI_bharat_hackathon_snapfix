const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Client = require('../models/Client')
const serverVariables = require('../../../serverVariables.js')
const getTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1]
  }
  if (req.cookies?.token) {
    return req.cookies.token
  }
  return null
}

// Main authentication middleware using custom JWT verification
const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req)

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' })
    }

    const jwtSecret = process.env.JWT_SECRET || serverVariables.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET is missing in environment variables')
      return res.status(500).json({ message: 'Server configuration error' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret, {
        issuer: 'snapfix',
        audience: 'snapfix-users',
      })
    } catch (error) {
      const message =
        error.name === 'TokenExpiredError'
          ? 'Token expired. Please login again.'
          : 'Invalid token.'
      return res.status(401).json({ message })
    }

    const { userId, clientId, role } = decoded || {}

    if (!userId || !role) {
      return res.status(401).json({ message: 'Invalid token payload' })
    }

    console.log("inside protect middleware");
    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    let resolvedClientId = clientId || (user.clientId ? user.clientId.toString() : null)
    let client = null

    if (resolvedClientId) {
      if (!user.clientId || user.clientId.toString() !== resolvedClientId) {
        return res.status(403).json({ message: 'User does not belong to this client' })
      }

      client = await Client.findById(resolvedClientId)
      if (!client) {
        return res.status(401).json({ message: 'Client not found' })
      }

      if (!user.isSaasOwner && client.status !== 'active') {
        return res.status(403).json({
          message: `Client is ${client.status}. Access denied.`,
        })
      }
    } else if (!user.isSaasOwner) {
      return res.status(403).json({ message: 'User is not associated with any client' })
    }

    // Get user's department and site IDs for filtering
    const departmentIds = user.departmentIds?.map((id) => id?.toString()).filter(Boolean) || []
    const siteIds = user.siteIds?.map((id) => id?.toString()).filter(Boolean) || []
    const roles = user.roles || []

    req.user = {
      userId: user._id.toString(),
      clientId: resolvedClientId,
      role,
      email: user.email,
      name: user.name,
      isSaasOwner: user.isSaasOwner,
      isSuperAdmin: user.isSuperAdmin,
      isClientAdmin: user.isClientAdmin,
      departmentIds, // Array of department IDs the user has access to
      siteIds, // Array of site IDs the user has access to
      roles, // Array of roles assigned to the user
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ message: 'Authentication error' })
  }
}

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      })
    }

    next()
  }
}

module.exports = { protect, authorize }

