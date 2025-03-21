// Admin controller

const User = require('../models/user');
const Product = require('../models/product');
const Category = require('../models/category');
const mongoose = require('mongoose');

// Get admin dashboard statistics
exports.getAdminStats = async (req, res) => {
  try {
    // Verify if the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Use count() instead of countDocuments() for compatibility
    const totalUsers = await User.find().count();
    const totalProducts = await Product.find().count();
    const totalCategories = await Category.find().count();

    // Get recent products (last 5)
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('publisher', 'firstName lastName email')
      .populate('category', 'name');

    // Get recent users (last 5)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    // Get product distribution by category
    const productsByCategory = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          productCount: { $size: '$products' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        recentProducts,
        recentUsers,
        productsByCategory
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
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

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    // Verify if the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    // Verify if the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check if isAdmin is provided
    if (isAdmin === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Admin status is required'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isAdmin },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

// Other admin controller functions would go here 