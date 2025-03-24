const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define storage locations
const UPLOADS_FOLDER = 'uploads';
const PRODUCT_IMAGES = `${UPLOADS_FOLDER}/products`;
const USER_IMAGES = `${UPLOADS_FOLDER}/users`;
const CATEGORY_IMAGES = `${UPLOADS_FOLDER}/categories`;

// Ensure upload directories exist
[UPLOADS_FOLDER, PRODUCT_IMAGES, USER_IMAGES, CATEGORY_IMAGES].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the destination based on the route
    let uploadPath = UPLOADS_FOLDER;
    
    if (req.originalUrl.includes('/products')) {
      uploadPath = PRODUCT_IMAGES;
    } else if (req.originalUrl.includes('/users')) {
      uploadPath = USER_IMAGES;
    } else if (req.originalUrl.includes('/categories')) {
      uploadPath = CATEGORY_IMAGES;
    }
    
    console.log("Uploading file to:", uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    console.log("Generated filename:", filename);
    cb(null, filename);
  }
});

// File filter function to accept only images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Upload limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10 // Max 10 files at once
};

// Create upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});

// Wrap your middleware to add logging
const uploadWithLogging = (req, res, next) => {
  console.log("==== UPLOAD MIDDLEWARE START ====");
  console.log("Request received for upload");
  
  upload(req, res, function(err) {
    if (err) {
      console.log("Upload middleware error:", err);
      return next(err);
    }
    
    console.log("Files uploaded:", req.files ? req.files.length : 'None');
    console.log("==== UPLOAD MIDDLEWARE END ====");
    next();
  });
};

// Single file upload middleware
exports.uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload middleware
exports.uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount || 10);

// Handle field uploads
exports.uploadFields = (fields) => upload.fields(fields);

// Error handling middleware for multer
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded. Maximum is 10 files.'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name in upload.'
      });
    }
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      success: false,
      message: err.message || 'Error uploading file.'
    });
  }
  next();
};

// Get the URL for the uploaded file
exports.getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/${filename.replace(/\\/g, '/')}`;
};

// Process uploaded files and return URLs
exports.processUploadedFiles = (req, res, next) => {
  // For single file upload
  if (req.file) {
    req.fileUrl = exports.getFileUrl(req, req.file.path);
  }
  
  // For multiple files upload
  if (req.files) {
    if (Array.isArray(req.files)) {
      // If req.files is an array (from upload.array())
      req.fileUrls = req.files.map(file => exports.getFileUrl(req, file.path));
    } else {
      // If req.files is an object with field names (from upload.fields())
      req.fileUrls = {};
      Object.keys(req.files).forEach(fieldName => {
        req.fileUrls[fieldName] = req.files[fieldName].map(file => 
          exports.getFileUrl(req, file.path)
        );
      });
    }
  }
  
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
  getFileUrl,
  processUploadedFiles
};