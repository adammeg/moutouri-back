const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { protect, admin } = require('../middleware/auth');

// Admin dashboard statistics
router.get('/stats', protect, admin, adminController.getAdminStats);

// Other admin routes
router.get('/products', protect, admin, adminController.getAllProducts);
router.put('/products/:id/verify', protect, admin, adminController.verifyProduct);
router.put('/products/:id/feature', protect, admin, adminController.featureProduct);
router.delete('/products/:id', protect, admin, adminController.deleteProduct);

// Get all users (admin only)
router.get('/users', protect, admin, adminController.getAllUsers);

// Update user role (admin only)
router.put('/users/:userId', protect, admin, adminController.updateUserRole);

module.exports = router;