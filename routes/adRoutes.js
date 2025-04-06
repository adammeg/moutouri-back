const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad');
const { protect, admin } = require('../middleware/auth');
const { uploadSingle, handleUploadError, processUploadedFiles } = require('../middleware/upload');

// Public routes
router.get('/position/:position', adController.getActiveAdsByPosition);
router.post('/track/impression/:adId', adController.trackAdImpression);
router.post('/track/click/:adId', adController.trackAdClick);

// Admin-only routes
router.get('/', protect, admin, adController.getAllAds);
router.get('/stats', protect, admin, adController.getAdStats);

// Create ad (admin)
router.post('/',
  protect,
  admin,
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  adController.createAd
);

// Update ad (admin)
router.put('/:id',
  protect,
  admin,
  uploadSingle,
  uploadSingle('image'),
  handleUploadError,
  processUploadedFiles,
  adController.updateAd
);

// Delete ad (admin)
router.delete('/:id', protect, admin, adController.deleteAd);

module.exports = router;