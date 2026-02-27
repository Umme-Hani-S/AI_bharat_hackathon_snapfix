const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
   },
    phone: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'basic',
    },
    sites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
    }],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries (email index already created by unique: true)
clientSchema.index({ status: 1 })
clientSchema.index({ companyName: 1 })

module.exports = mongoose.model('Client', clientSchema)

