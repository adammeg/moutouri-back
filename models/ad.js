const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  image: {
    type: String,
    required: [true, 'Image is required']
  },
  link: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    enum: ['home-hero', 'home-middle', 'home-bottom', 'sidebar', 'product-page'],
    default: 'home-middle'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: false
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for performance
AdSchema.index({ position: 1, isActive: 1, startDate: 1, endDate: 1 });
AdSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Ad', AdSchema);