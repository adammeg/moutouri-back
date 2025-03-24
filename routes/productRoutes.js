const express = require('express');
const router = express.Router();
const productController = require('../controllers/product');
const { protect } = require('../middleware/auth');
const { uploadMultiple, processUploadedFiles, handleUploadError } = require('../middleware/upload');
const upload = require('../middleware/upload');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/latest', productController.getLatestProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Protected routes with file upload
router.post('/', 
  protect, 
  upload.uploadWithLogging,  // Use logging wrapper for product uploads
  productController.createProduct
);

router.put('/:id', 
  protect, 
  uploadMultiple('images', 10),
  handleUploadError,
  processUploadedFiles,
  productController.updateProduct
);

router.delete('/:id', protect, productController.deleteProduct);

module.exports = router; 