const Ad = require('../models/ad');
const { processUploadedFiles } = require('../middleware/upload');
const mongoose = require('mongoose');
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

// Get active ads for a specific position with optimized query
exports.getActiveAdsByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    const now = new Date();
    
    // Optimized query with proper indexing support
    const ads = await Ad.find({
      position,
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    })
    .select('title description image link position') // Only select needed fields
    .sort({ createdAt: -1 })
    .limit(3); // Limit to 3 ads for performance
    
    // Log metrics for monitoring
    console.log(`Ad request for position '${position}': Found ${ads.length} ads`);
    
    return res.status(200).json({
      success: true,
      count: ads.length,
      ads
    });
  } catch (error) {
    console.error('Error fetching ads by position:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch ads',
      error: error.message
    });
  }
};

// Create a new ad with enhanced validation
exports.createAd = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.title || !req.body.description || !req.body.position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description and position'
      });
    }
    
    // Check if image was uploaded
    if (!req.fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for the ad'
      });
    }

    // Create ad with user as creator
    const ad = await Ad.create({
      title: req.body.title,
      description: req.body.description,
      image: req.fileUrl,
      link: req.body.link,
      position: req.body.position,
      isActive: req.body.isActive === 'true',
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      ad
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not create ad',
      error: error.message
    });
  }
};

// Track ad impressions
exports.trackAdImpression = async (req, res) => {
  try {
    const { adId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID'
      });
    }
    
    await Ad.findByIdAndUpdate(adId, {
      $inc: { impressions: 1 }
    });
    
    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Track ad clicks
exports.trackAdClick = async (req, res) => {
  try {
    const { adId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID'
      });
    }
    
    await Ad.findByIdAndUpdate(adId, {
      $inc: { clicks: 1 }
    });
    
    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Error tracking ad click:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get ad statistics for admin dashboard
exports.getAdStats = async (req, res) => {
  try {
    const stats = await Ad.aggregate([
      {
        $match: { createdBy: mongoose.Types.ObjectId(req.user._id) }
      },
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          activeAds: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $lte: ["$startDate", new Date()] },
                    { 
                      $or: [
                        { $eq: ["$endDate", null] },
                        { $gte: ["$endDate", new Date()] }
                      ]
                    }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          totalImpressions: { $sum: { $ifNull: ["$impressions", 0] } },
          totalClicks: { $sum: { $ifNull: ["$clicks", 0] } }
        }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      stats: stats.length > 0 ? stats[0] : {
        totalAds: 0,
        activeAds: 0,
        totalImpressions: 0,
        totalClicks: 0
      }
    });
  } catch (error) {
    console.error('Error getting ad stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch ad statistics',
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