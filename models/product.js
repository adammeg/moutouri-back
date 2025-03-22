const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'excellent', 'good', 'fair', 'salvage'],
    required: [true, 'Condition is required']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1700, 'Year must be after 1700'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  kilometrage: {
    type: Number,
    required: [true, 'Kilometrage is required'],
    min: [0, 'Kilometrage cannot be negative']
  },
  cylinder: {
    type: Number,
    required: [true, 'Cylinder information is required']
  },
  images: {
    type: [String],
    required: [true, 'At least one product image is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  publisher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Publisher information is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  } 
}, { timestamps: true });

// Index for search performance
productSchema.index({ title: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
