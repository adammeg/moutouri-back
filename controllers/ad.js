const Ad = require('../models/ad');
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

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

// Enhanced createAd function with Cloudinary support
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
    if (!req.fileUrl && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for the ad'
      });
    }

    let imageUrl = req.fileUrl;
    
    // If we have a file but no fileUrl (direct file upload), upload to Cloudinary
    if (req.file && !req.fileUrl) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'moutouri/ads',
          resource_type: 'image',
          transformation: [
            { width: 1200, crop: "limit" },
            { quality: "auto" }
          ]
        });
        
        imageUrl = result.secure_url;
        
        // Clean up the local file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image to Cloudinary',
          error: uploadError.message
        });
      }
    }

    // Create ad with proper image URL and user as creator
    const ad = await Ad.create({
      title: req.body.title,
      description: req.body.description,
      image: imageUrl,
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

// Update an ad with improved Cloudinary handling
exports.updateAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }
    
    // Handle image update if a new one was uploaded
    if (req.file || req.fileUrl) {
      // If there's an existing Cloudinary image, delete it
      if (ad.image && ad.image.includes('cloudinary.com')) {
        try {
          // Extract public ID from Cloudinary URL
          const publicId = ad.image.split('/').slice(-1)[0].split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`moutouri/ads/${publicId}`);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old image from Cloudinary:', deleteError);
          // Continue with the update even if deletion fails
        }
      }
      
      // Use existing fileUrl from middleware or upload directly
      let imageUrl = req.fileUrl;
      
      // If we have a file but no fileUrl, upload to Cloudinary
      if (req.file && !req.fileUrl) {
        try {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'moutouri/ads',
            resource_type: 'image',
            transformation: [
              { width: 1200, crop: "limit" },
              { quality: "auto" }
            ]
          });
          
          imageUrl = result.secure_url;
          
          // Clean up the local file
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Error uploading image to Cloudinary',
            error: uploadError.message
          });
        }
      }
      
      // Set the new image URL
      req.body.image = imageUrl;
    }
    
    // Update the ad
    const updatedAd = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    return res.status(200).json({
      success: true,
      message: 'Ad updated successfully',
      ad: updatedAd
    });
  } catch (error) {
    console.error('Error updating ad:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not update ad',
      error: error.message
    });
  }
};

// Delete an ad with Cloudinary cleanup
exports.deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }
    
    // Delete the image from Cloudinary if it exists
    if (ad.image && ad.image.includes('cloudinary.com')) {
      try {
        // Extract public ID from Cloudinary URL
        const publicId = ad.image.split('/').slice(-1)[0].split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`moutouri/ads/${publicId}`);
          console.log(`Deleted image from Cloudinary: ${publicId}`);
        }
      } catch (deleteError) {
        console.warn('Failed to delete image from Cloudinary:', deleteError);
        // Continue with deletion even if image removal fails
      }
    }
    
    // Delete the ad from the database
    await Ad.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not delete ad',
      error: error.message
    });
  }
};

// Create a new ad with enhanced validation

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