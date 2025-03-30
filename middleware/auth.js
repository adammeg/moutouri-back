const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware to protect routes
// Protect middleware
exports.protect = async (req, res, next) => {
    try {
      console.log(`🔒 Auth check for ${req.method} ${req.originalUrl}`);
      console.log(`🔍 Headers: ${JSON.stringify({
        auth: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type']
      })}`);
      
      let token;
      
      // Check for token in headers
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
      ) {
        token = req.headers.authorization.split(' ')[1];
      } else {
        console.log("❌ No Bearer token in headers");
      }
  
      if (!token) {
        console.log("🚫 No token provided, rejecting request");
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this route'
        });
      }
  
      try {
        console.log("🔍 Verifying token");
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token verified for user:", decoded.id);
        
        // Find user by id
        const user = await User.findOne({ 
          _id: decoded.id,
          isActive: true 
        }).select('-password');
  
        if (!user) {
          console.log("👤 User not found or inactive");
          return res.status(401).json({
            success: false,
            message: 'User not found or inactive'
          });
        }
  
        console.log("👤 User authenticated:", user._id.toString());
        req.user = user;
        next();
      } catch (error) {
        console.error("🚨 Token verification error:", error.message);
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed',
          error: error.message
        });
      }
    } catch (error) {
      console.error("🚨 Auth middleware error:", error);
      res.status(500).json({
        success: false,
        message: 'Server error in auth middleware',
        error: error.message
      });
    }
  };

// Middleware to restrict to admin only
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin'
    });
  }
}; 