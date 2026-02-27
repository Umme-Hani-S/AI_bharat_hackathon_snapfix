const mongoose = require('mongoose')

const unclearImageSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for public submissions
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
      index: true,
    },
    imageHash: {
      type: String,
      required: true,
      index: true,
    },
    // For public submissions without userId, we can use IP or locationId
    publicIdentifier: {
      type: String, // Can be IP address, locationId, or session identifier
      default: null,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Track the reason: 'image_unclear' or 'requires_user_input' (general)
    reason: {
      type: String,
      enum: ['image_unclear', 'requires_user_input'],
      default: 'requires_user_input',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient queries by hash (to detect same image even with different URLs)
unclearImageSubmissionSchema.index({ userId: 1, imageHash: 1, reason: 1 })
unclearImageSubmissionSchema.index({ publicIdentifier: 1, imageHash: 1, reason: 1 })
unclearImageSubmissionSchema.index({ clientId: 1, imageHash: 1, reason: 1 })
// Also keep URL index for reference
unclearImageSubmissionSchema.index({ userId: 1, imageUrl: 1 })
unclearImageSubmissionSchema.index({ publicIdentifier: 1, imageUrl: 1 })

// TTL index to auto-delete old records (optional - keeps last 30 days)
unclearImageSubmissionSchema.index({ submittedAt: 1 }, { expireAfterSeconds: 2592000 })

module.exports = mongoose.model('UnclearImageSubmission', unclearImageSubmissionSchema)

