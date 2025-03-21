const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const { protect, admin } = require('../middleware/auth');
const { uploadSingle, processUploadedFiles, handleUploadError } = require('../middleware/upload');

// Public routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected routes with file upload
router.get('/profile', protect, userController.getUserProfile);
router.put('/profile', 
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  userController.updateUserProfile
);

// Admin routes
router.get('/', protect, admin, userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.delete('/:id', protect, userController.deleteUser); // User can delete themselves, admin can delete anyone
router.put('/:id/role', protect, admin, userController.changeUserRole);

// Public routes to get user's products
router.get('/:id/products', userController.getUserProducts);

// Refresh token routes
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', protect, userController.logoutUser);

module.exports = router; 