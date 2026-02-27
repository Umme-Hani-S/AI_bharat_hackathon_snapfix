const mongoose = require('mongoose')

const issueSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    images: {
      type: [String],
      default: [],
    },
    resolutionImages: {
      type: [String],
      default: [],
    },
    resolutionDescription: {
      type: String,
      trim: true,
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    slaDeadline: {
      type: Date,
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    resolutionTime: {
      type: Date,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for public tickets
      default: null,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },

    aiReportAnalysis: {
      suggestedPersonal: [mongoose.Schema.Types.Mixed],
      potentialRisks: [mongoose.Schema.Types.Mixed],
      aiIssueTitle: String,
    },

    aiResolutionAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      aiValidationAnalysis: String,
      aiValidationSuggestions: [String],
      aiValidationConfidence: Number,
    },
    
    // GPS coordinates when issue was created
    createdGps: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    
    // GPS coordinates when issue was resolved
    resolvedGps: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    
    // Platform/device from which issue was created
    platform: {
      type: String,
      enum: ['web', 'mobile-ios', 'mobile-android', 'mobile-web', 'public', 'api'],
      default: 'web',
    },

    // Activity comments: creation, status changes, resolution, edits, assignment
    comments: [
      {
        type: {
          type: String,
          enum: ['created', 'status', 'resolved', 'edit', 'assigned'],
          required: true,
        },
        message: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: Date.now },
        payload: {
          oldStatus: String,
          newStatus: String,
          changedFields: [String],
          assignedTo: mongoose.Schema.Types.ObjectId,
          fieldChanges: mongoose.Schema.Types.Mixed, // e.g. { title: { from: 'x', to: 'y' } }
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

issueSchema.index({ clientId: 1, site: 1, status: 1 })

module.exports = mongoose.model('Issue', issueSchema)

