console.log('Loading Category controller...');
const CategoryModule = require('../models/category');
console.log('Category module type:', typeof CategoryModule);
console.log('Category module structure:', Object.keys(CategoryModule));

// If the Category export is nested, try accessing it like this:
const Category = typeof CategoryModule === 'object' && CategoryModule.Category 
  ? CategoryModule.Category 
  : CategoryModule;

console.log('Category model resolved:', !!Category);

const Product = require('../models/product');
const mongoose = require('mongoose');
const path = require('path');

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Create the slug from the name
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        // Handle image upload without duplicating the /uploads/
        const image = req.file ? req.file.filename : null;
        // Alternatively, if you want the full path, make sure there's no duplication:
        // const image = req.file ? path.join('uploads', req.file.filename).replace(/\\/g, '/') : null;

        // Check if category already exists
        const existingCategory = await Category.findOne({ 
            $or: [
                { name },
                { slug }
            ]
        });
        
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'A category with this name or slug already exists'
            });
        }

        // Create category
        const category = new Category({
            name,
            slug,
            description,
            image,
            isActive: true
        });

        const newCategory = await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: newCategory
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A category with this name or slug already exists',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;
        const categoryId = req.params.id;

        // Find category
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Update fields
        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (req.file) category.image = `/uploads/${req.file.filename}`;
        if (isActive !== undefined) category.isActive = isActive === "true" || isActive === true;

        // Update slug if name changed
        if (name) {
            category.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        }

        category.updatedAt = Date.now();

        const updatedCategory = await category.save();

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if there are products using this category
        const productsCount = await Product.countDocuments({ category: categoryId });

        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category as it is associated with ${productsCount} products`
            });
        }

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
    try {
        console.log('Fetching all categories...');
        
        // Check if Category model is available
        if (!Category) {
            console.error('Category model is not defined');
            return res.status(500).json({
                success: false,
                message: 'Internal server error - category model not defined'
            });
        }
        
        const categories = await Category.find({ isActive: true }).sort('name');
        
        console.log(`Found ${categories.length} categories`);
        
        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

// @desc    Get a single category by ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find by ID
        const category = await Category.findOne({
            _id: mongoose.Types.ObjectId.isValid(id) ? id : null,
            isActive: true
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        });
    }
};

// @desc    Get a single category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const category = await Category.findOne({
            slug,
            isActive: true
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        });
    }
};

// @desc    Get products by category
// @route   GET /api/categories/:id/products
// @access  Public
exports.getCategoryProducts = async (req, res) => {
    try {
        const { id } = req.params;

        // Find category by ID or slug
        const category = await Category.findOne({
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
                { slug: id }
            ],
            isActive: true
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Get products for this category
        const products = await Product.find({
            category: category._id,
            isActive: true
        }).populate('publisher', 'firstName lastName');

        res.status(200).json({
            success: true,
            category: {
                id: category._id,
                name: category.name,
                slug: category.slug
            },
            count: products.length,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category products',
            error: error.message
        });
    }
};
