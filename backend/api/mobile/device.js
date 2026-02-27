const express = require('express')
const { body, validationResult } = require('express-validator')
const { protect } = require('../../src/middleware/auth')
const User = require('../../src/models/User')

const router = express.Router()

// Register device token for push notifications
router.post(
  '/register',
  protect,
  [
    body('deviceToken').trim().notEmpty().withMessage('Device token is required'),
    body('platform').optional().isIn(['ios', 'android']).withMessage('Platform must be ios or android'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { deviceToken, platform } = req.body
      const userId = req.user?.userId

      // Update user with device token
      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          deviceTokens: {
            token: deviceToken,
            platform: platform || 'unknown',
            registeredAt: new Date(),
          },
        },
      })

      res.json({ message: 'Device registered successfully' })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

// Unregister device token
router.post(
  '/unregister',
  protect,
  [body('deviceToken').trim().notEmpty().withMessage('Device token is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
      }

      const { deviceToken } = req.body
      const userId = req.user?.userId

      // Remove device token from user
      await User.findByIdAndUpdate(userId, {
        $pull: {
          deviceTokens: { token: deviceToken },
        },
      })

      res.json({ message: 'Device unregistered successfully' })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Server error' })
    }
  }
)

module.exports = router

