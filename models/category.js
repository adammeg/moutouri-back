const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
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

// Pre-save hook to create slug from name if not provided
categorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

// Index for better search performance
categorySchema.index({ name: 1, slug: 1 });

const Category = mongoose.model('Category', categorySchema);

// Create main categories if they don't exist
const createMainCategories = async () => {
  const mainCategories = [
    { name: 'Scooters', slug: 'scooters', description: 'All types of scooters' },
    { name: 'Motorbikes', slug: 'motorbikes', description: 'All types of motorbikes' },
    { name: 'Moto Parts', slug: 'moto-parts', description: 'Spare parts for motorcycles and scooters' }
  ];

  try {
    for (const category of mainCategories) {
      await Category.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true }
      );
    }
    console.log('Main categories created successfully');
  } catch (error) {
    console.error('Error creating main categories:', error);
  }
};

// Export the model and the function to create categories
module.exports = {
  Category,
  createMainCategories
};
