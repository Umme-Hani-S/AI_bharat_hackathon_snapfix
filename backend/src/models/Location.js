const mongoose = require('mongoose')

const locationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    locationCode: {
      type: String,
      trim: true,
    },
    shortCode: {
      type: String,
      trim: true,
      // Index defined below via schema.index() to avoid duplicate
    },
    loc: {
      type: {
        type: String,
        enum: ['Point', 'LineString', 'Polygon'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude] for GeoJSON
      },
    },
    area: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    timeZone: {
      type: String,
      default: 'UTC',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: false, // Allow additional fields for flexibility
  }
)

// Indexes
locationSchema.index({ clientId: 1, siteId: 1 })
locationSchema.index({ clientId: 1, name: 1 }, { unique: true })
locationSchema.index({ shortCode: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Location', locationSchema)
