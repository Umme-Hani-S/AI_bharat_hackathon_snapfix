const mongoose = require('mongoose')

const siteSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    enableSms: {
      type: Boolean,
      default: false,
    },
    enableGps: {
      type: Boolean,
      default: false,
    },
    timeZone: {
      type: String,
      default: 'UTC',
    },
    timeZoneOffset: {
      type: Number,
      default: 0,
    },
    timeZoneId: {
      type: Number,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
)

siteSchema.index({ clientId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('Site', siteSchema)


