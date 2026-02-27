const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    isCompliance: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    siteUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
      },
    ],
  },
  {
    timestamps: true,
  }
)

departmentSchema.index({ clientId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('Department', departmentSchema)


