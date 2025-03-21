const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category');
const { protect, admin } = require('../middleware/auth');
const { uploadSingle, handleUploadError, processUploadedFiles } = require('../middleware/upload');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id/products', categoryController.getCategoryProducts);

// Admin routes
router.post('/', 
  protect, 
  admin, 
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  categoryController.createCategory
);

router.put('/:id', 
  protect, 
  admin, 
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  categoryController.updateCategory
);

router.delete('/:id', protect, admin, categoryController.deleteCategory);

module.exports = router; 