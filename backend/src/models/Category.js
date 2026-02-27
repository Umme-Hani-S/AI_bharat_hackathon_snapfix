const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

categorySchema.index({ clientId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('Category', categorySchema)


