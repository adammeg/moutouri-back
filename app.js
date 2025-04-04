const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected - Database is ready');
  // Check if models are loaded properly
  console.log('📚 Checking models...');
  try {
    const User = require('./models/user');
    const Product = require('./models/product');
    const Category = require('./models/category');
    console.log('✅ All models loaded successfully');
  } catch (err) {
    console.error('❌ Error loading models:', err);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'https://moutouri-git-main-adams-projects-88d5dcc2.vercel.app',
    'https://moutouri.vercel.app',
    'https://www.moutouri.tn',
    // Add any other domains your application might use
  ],  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this middleware before defining routes to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adRoutes = require('./routes/adRoutes');

// Use routes
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/admin', adminRoutes);
app.use('/ads', adRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Moutouri API' });
});

// Add error handler middleware after all routes
app.use((err, req, res, next) => {
  console.error('🚨 SERVER ERROR:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;