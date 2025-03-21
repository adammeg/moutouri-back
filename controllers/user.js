const User = require('../models/user');
const Product = require('../models/product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Generate access token - short lived (15-60 minutes)
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Short-lived token
  );
};

// Generate refresh token - longer lived (days/weeks)
const generateRefreshToken = (user) => {
  // Create a random token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Set expiry date - 7 days from now
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
  
  // Save to user
  user.refreshToken = refreshToken;
  user.refreshTokenExpiry = refreshTokenExpiry;
  
  return refreshToken;
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone
    });

    if (user) {
      // Generate refresh token
      const refreshToken = generateRefreshToken(user);
      await user.save(); // Save the refresh token to user
      
      res.status(201).json({
        success: true,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        accessToken: generateAccessToken(user),
        refreshToken
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create a refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.save();
    
    console.log(`✅ Login successful for ${user.email}`);
    console.log(`🔑 Generated access token (first 15 chars): ${accessToken.substring(0, 15)}...`);
    
    // Clear sensitive data
    const userToReturn = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      image: user.image
    };
    
    // Send response with tokens
    res.status(200).json({
      success: true,
      user: userToReturn,
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/users/refresh-token
// @access  Public (with refresh token)
exports.refreshToken = async (req, res) => {
  try {
    console.log("🔄 Refresh token request received");
    const { refreshToken } = req.body;

    if (!refreshToken) {
      console.log("❌ No refresh token provided");
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token is required' 
      });
    }

    console.log("🔍 Looking for user with refresh token");
    // Find user by refresh token
    const user = await User.findOne({ 
      refreshToken,
      refreshTokenExpiry: { $gt: new Date() } // Check if token is still valid
    });

    if (!user) {
      console.log("👤 No user found with valid refresh token");
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired refresh token' 
      });
    }

    console.log("👤 User found, generating new tokens for:", user.email);
    
    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.save();
    
    console.log("✅ New tokens generated successfully");
    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        image: user.image
      }
    });
  } catch (error) {
    console.error("🚨 Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    // Clear refresh token in database
    const user = await User.findById(req.user.id);
    
    if (user) {
      user.refreshToken = null;
      user.refreshTokenExpiry = null;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    console.log("🔍 Get user profile request received");
    
    // The user object should be attached to req by the protect middleware
    const user = req.user;
    
    if (!user) {
      console.log("❌ No user attached to request");
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`✅ Returning profile for user: ${user.email}`);
    
    // Return user data (excluding sensitive fields)
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        image: user.image || null
      }
    });
  } catch (error) {
    console.error("🚨 Get profile error:", error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    // Get user from the auth middleware
    const userId = req.user.id;
    
    // Check if a file was uploaded
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    // Find user and update
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...(req.body.firstName && { firstName: req.body.firstName }),
        ...(req.body.lastName && { lastName: req.body.lastName }),
        ...(req.body.phone && { phone: req.body.phone }),
        ...(image && { image }), // Add image path if a file was uploaded
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    // Only allow admins or the user themselves to delete their account
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - set isActive to false
    user.isActive = false;
    user.updatedAt = Date.now();
    await user.save();

    // Alternatively, for hard delete:
    // await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// @desc    Get all products published by a user
// @route   GET /api/users/:id/products
// @access  Public
exports.getUserProducts = async (req, res) => {
  try {
    const products = await Product.find({ 
      publisher: req.params.id,
      isActive: true 
    }).populate('category', 'name slug');
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user products',
      error: error.message
    });
  }
};

// @desc    Change user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.changeUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change user roles'
      });
    }

    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change user role',
      error: error.message
    });
  }
};
