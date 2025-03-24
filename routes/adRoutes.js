const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad');
const { protect, admin } = require('../middleware/auth');
const { uploadSingle, handleUploadError, processUploadedFiles } = require('../middleware/upload');

// Public route - get active ads by position
router.get('/position/:position', protect,admin, adController.getActiveAdsByPosition);

// Admin-only routes

// Get all ads (admin)
router.get('/', protect, admin, adController.getAllAds);

// Create ad (admin)
router.post('/',
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  adController.createAd
);

// Update ad (admin)
router.put('/:id',
  protect,
  admin,
  uploadSingle('image') ,
  handleUploadError,
  processUploadedFiles,
  adController.updateAd);

// Delete ad (admin)
router.delete('/:id', protect, admin, adController.deleteAd);

module.exports = router;