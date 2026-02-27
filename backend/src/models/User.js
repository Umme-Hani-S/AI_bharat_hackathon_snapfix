const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isClientAdmin: {
      type: Boolean,
      default: false,
    },
    isSaasOwner: {
      type: Boolean,
      default: false,
    },
    // Multiple roles per user
    roles: [{
      type: String,
      enum: ['head-of-staff', 'field-staff', 'tenants', 'vendors'],
      required: true,
    }],
    // Multi-select sites
    siteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
    }],
    // Multi-select departments (shared across sites)
    departmentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    // Device tokens for push notifications
    deviceTokens: [{
      token: {
        type: String,
        required: true,
      },
      platform: {
        type: String,
        enum: ['ios', 'android', 'unknown'],
        default: 'unknown',
      },
      registeredAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)

