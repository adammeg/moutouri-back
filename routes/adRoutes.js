const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, handleUploadError, processUploadedFiles } = require('../middleware/upload');

// Public route - get active ads by position
router.get('/position/:position', adController.getActiveAdsByPosition);

// Admin-only routes
router.use(protect);
router.use(authorize('admin'));

// Get all ads (admin)
router.get('/', adController.getAllAds);

// Create ad (admin)
router.post('/',
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  adController.createAd
);

// Update ad (admin)
router.put('/:id',
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  adController.updateAd
);

// Delete ad (admin)
router.delete('/:id', adController.deleteAd);

module.exports = router;