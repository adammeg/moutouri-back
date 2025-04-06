const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dzamzt9og',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Create storage engine for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'moutouri/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }]
  }
});

const adStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'moutouri/ads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }]
  }
});

// Create storage engine for category images
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'moutouri/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, crop: 'limit' }]
  }
});

// Create storage engine for user profile images
const userStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'moutouri/users',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, crop: 'limit' }]
  }
});

// Create storage engine for banner images
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'moutouri/banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1920, crop: 'limit' }]
  }
});

// Create multer instances
const uploadProductImages = multer({ 
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadCategoryImage = multer({ 
  storage: categoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const uploadUserImage = multer({ 
  storage: userStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const uploadBannerImage = multer({ 
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadAdImage = multer({ 
  storage: adStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Helper function to get just the public ID from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} - The public ID, or null if not a valid Cloudinary URL
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Check if it's a Cloudinary URL
  if (!url.includes('cloudinary.com')) return null;
  
  try {
    // Extract the public ID portion
    const regex = /\/v\d+\/(.+?)\./;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} url - The Cloudinary URL of the image to delete
 * @returns {Promise<Object>} - Cloudinary API response
 */
const deleteImage = async (url) => {
  try {
    const publicId = getPublicIdFromUrl(url);
    
    if (!publicId) {
      throw new Error('Invalid Cloudinary URL or could not extract public ID');
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadProductImages,
  uploadCategoryImage,
  uploadUserImage,
  uploadBannerImage,
  uploadAdImage,
  getPublicIdFromUrl,
  deleteImage
};