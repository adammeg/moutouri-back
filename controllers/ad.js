const Ad = require('../models/ad');
const { processUploadedFiles } = require('../middleware/upload');

// Get all ads
exports.getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName');
    res.status(200).json({
      success: true,
      count: ads.length,
      ads
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({
      success: false,
      message: 'Could not fetch ads',
      error: error.message
    });
  }
};

// Get active ads for a specific position
exports.getActiveAdsByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    
    // Find active ads that are within their date range
    const ads = await Ad.find({
      position,
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ],
      startDate: { $lte: new Date() }
    }).sort({ createdAt: -1 }).limit(5);
    
    res.status(200).json({
      success: true,
      count: ads.length,
      ads
    });
  } catch (error) {
    console.error('Error fetching ads by position:', error);
    res.status(500).json({
      success: false,
      message: 'Could not fetch ads',
      error: error.message
    });
  }
};

// Create a new ad
exports.createAd = async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.fileUrl && !req.fileUrls) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for the ad'
      });
    }

    // Get image URL from middleware
    const image = req.fileUrl || (req.fileUrls && req.fileUrls[0]);

    // Create ad with user as creator
    const ad = await Ad.create({
      ...req.body,
      image,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      ad
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({
      success: false,
      message: 'Could not create ad',
      error: error.message
    });
  }
};

// Update an ad
exports.updateAd = async (req, res) => {
  try {
    let ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }
    
    // Update image if a new one was uploaded
    if (req.fileUrl) {
      req.body.image = req.fileUrl;
    }
    
    // Update the ad
    ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Ad updated successfully',
      ad
    });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({
      success: false,
      message: 'Could not update ad',
      error: error.message
    });
  }
};

// Delete an ad
exports.deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }
    
    await Ad.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({
      success: false,
      message: 'Could not delete ad',
      error: error.message
    });
  }
};