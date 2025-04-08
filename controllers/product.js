const Product = require('../models/product');
const Category = require('../models/category');
const mongoose = require('mongoose');
const { cloudinary, deleteImage } = require('../config/cloudinary');
const User = require('../models/user');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    console.log("==== CREATE PRODUCT DEBUG ====");
    console.log("Request body:", req.body);
    console.log("Files received:", req.files || 'No files');
    console.log("Required fields check:", {
      cylinder: !!req.body.cylinder, 
      kilometrage: !!req.body.kilometrage,
      year: !!req.body.year
    });
    
    // Process image files from middleware
    if (req.fileUrls && req.fileUrls.length > 0) {
      console.log('🖼️ Image URLs:', req.fileUrls);
      req.body.images = req.fileUrls;
    } else {
      console.log('❌ No images received from middleware');
    }
    
    // Set the user to the current user
    req.body.user = req.user._id;
    
    // Create the product
    const product = await Product.create(req.body);
    
    console.log('✅ Product created successfully:', product._id);
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    
    // Detailed validation error handling
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      
      // Extract each validation error
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
      
      console.log('🔍 Validation errors:', validationErrors);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// @desc    Get all products with filters
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, condition, location } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (search) {
      // Improve search with regex and case insensitivity 
      // Also search in multiple fields
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (condition) {
      query.condition = condition;
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    console.log("Query filters:", query);
    
    // Execute query with filters
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('user', 'firstName lastName image')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${products.length} products matching filters`);
    
    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error("Product search error:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching products",
      error: error.message
    });
  }
};

// @desc    Get a single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`🔍 Fetching product with ID: ${productId}`);
    
    // Find product by ID and populate category and user information
    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('user', 'firstName lastName email phone image createdAt');
    
    if (!product) {
      console.log(`❌ Product not found: ${productId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log(`✅ Product found: ${product.title}`);
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error(`🚨 Error fetching product: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check ownership
    if (product.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }
    
    // Check if category is valid when updated
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { 
        ...req.body,
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    ).populate('category', 'name slug');
    
    res.status(200).json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// @desc    Delete a product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check ownership
    if (product.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }
    
    // Delete images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      // Delete each image from Cloudinary
      const deletePromises = product.images.map(imageUrl => deleteImage(imageUrl));
      await Promise.all(deletePromises);
    }
    
    // Soft delete
    product.isActive = false;
    product.updatedAt = Date.now();
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// @desc    Get latest products
// @route   GET /api/products/latest
// @access  Public
exports.getLatestProducts = async (req, res) => {
  try {
    const limit = req.query.limit || 6;
    
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('category', 'name slug')
      .populate('user', 'firstName lastName');
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest products',
      error: error.message
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const products = await Product.find({
      $text: { $search: q },
      isActive: true
    })
      .populate('category', 'name slug')
      .populate('user', 'firstName lastName')
      .sort({ score: { $meta: 'textScore' } });
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
};

// If needed, update your getProducts controller to populate category information
exports.getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, limit = 50 } = req.query;
    
    const query = { isActive: true };
    
    // Add filters
    if (category) {
      query.category = category;
    }
    
    if (minPrice) {
      query.price = { $gte: Number(minPrice) };
    }
    
    if (maxPrice) {
      query.price = { ...query.price, $lte: Number(maxPrice) };
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Get products with category and user info
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
}

exports.getSearchSuggestions = async (req, res) => {
  try {
    console.log('⚙️ getSearchSuggestions called');
    console.log('🔍 Product model:', typeof Product !== 'undefined' ? 'Defined' : 'Undefined');
    console.log('🔍 Category model:', typeof Category !== 'undefined' ? 'Defined' : 'Undefined');
    
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }
    
    // Create a regex for case-insensitive search
    const searchRegex = new RegExp(q, 'i');
    
    // Find products matching the query in title, description, or brand
    const products = await Product.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { model: searchRegex },
        { color: searchRegex },
        { location: searchRegex }
      ]
    })
    .limit(10)
    .select('title brand model');
    
    // Extract suggestions from products
    let suggestions = products.map(product => product.title);
    
    // Add category matches
    const categories = await Category.find({
      name: searchRegex
    }).select('name');
    
    if (categories.length > 0) {
      const categoryNames = categories.map(cat => cat.name);
      suggestions = [
        ...suggestions,
        ...categoryNames.map(name => `${name}`)
      ];
    }
    
    // Deduplicate and limit results
    suggestions = [...new Set(suggestions)].slice(0, 10);
    
    return res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search suggestions',
      error: error.message
    });
  }
};
