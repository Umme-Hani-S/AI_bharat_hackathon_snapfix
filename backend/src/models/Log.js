const mongoose = require('mongoose')

const logSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['issue-creation-organization', 'issue-creation-public', 'issue-creation-mobile', 'error', 'warning', 'info'],
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['error', 'warning', 'info', 'debug'],
      default: 'info',
      index: true,
    },
    errorStack: {
      type: String,
      required: false,
    },
    errorName: {
      type: String,
      required: false,
    },
    fileName: {
      type: String,
      required: true,
    },
    lineNumber: {
      type: Number,
      required: true,
    },
    functionName: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient querying
logSchema.index({ createdAt: -1 })
logSchema.index({ type: 1, createdAt: -1 })
logSchema.index({ clientId: 1, createdAt: -1 })

module.exports = mongoose.model('Log', logSchema)

