// Admin controller

const User = require('../models/user');
const Product = require('../models/product');
const Category = require('../models/category');
const mongoose = require('mongoose');

// Get admin dashboard statistics
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    
    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');
    
    // Recent products
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('category', 'name')
      .populate('publisher', 'firstName lastName');
    
    // Products by category
    const productsByCategory = await Category.aggregate([
      { $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      { $project: {
          name: 1,
          count: { $size: '$products' }
        }
      }
    ]);
    
    // Monthly registrations
    const monthlyRegistrations = await User.aggregate([
      {
        $group: {
          _id: { 
            month: { $month: '$createdAt' }, 
            year: { $year: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalCategories,
        recentUsers,
        recentProducts,
        productsByCategory,
        monthlyRegistrations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
};

// Get all products (admin)
exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, status, sort, page = 1, limit = 10 } = req.query;
    
    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Build sort
    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'title-asc') {
      sortOptions = { title: 1 };
    } else if (sort === 'title-desc') {
      sortOptions = { title: -1 };
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('category', 'name')
      .populate('publisher', 'firstName lastName email');
    
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Verify a product
exports.verifyProduct = async (req, res) => {
  try {
    const { isVerified } = req.body;
    
    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean value'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    product.isVerified = isVerified;
    product.verifiedAt = isVerified ? Date.now() : null;
    product.verifiedBy = isVerified ? req.user.id : null;
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: `Product ${isVerified ? 'verified' : 'unverified'} successfully`,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product verification status',
      error: error.message
    });
  }
};

// Feature a product
exports.featureProduct = async (req, res) => {
  try {
    const { isFeatured } = req.body;
    
    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isFeatured must be a boolean value'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    product.isFeatured = isFeatured;
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product featured status',
      error: error.message
    });
  }
};

// Delete a product (admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Other admin controller functions would go here 