const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const GrantApplication = require('../models/GrantApplication');
const path = require('path');

// Maximum number of admin users allowed
const MAX_ADMIN_USERS = 4;

// Generate admin JWT token with longer expiry
const generateAdminToken = (userId) => {
  return jwt.sign({ userId, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Admin tokens last 7 days
  });
};

// Admin login
exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find admin user by email (username)
    const admin = await User.findOne({ email: username, role: 'ADMIN' });
    
    if (!admin) {
      return res.status(401).json({ 
        message: 'Invalid admin credentials'
      });
    }
    
    // Verify password
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Invalid admin credentials'
      });
    }
    
    // Generate admin token
    const token = generateAdminToken(admin._id);
    
    // Return admin info and token
    res.json({
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      token
    });
    
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ 
      message: 'Server error during admin login', 
      error: error.message 
    });
  }
};

// Verify admin token
exports.verifyAdminToken = async (req, res) => {
  try {
    // Token verification happens in middleware
    // If we get here, the token is valid
    
    // Return simple verification response
    res.json({
      valid: true,
      userId: req.user.userId
    });
    
  } catch (error) {
    console.error('Token Verification Error:', error);
    res.status(500).json({ 
      message: 'Server error verifying token',
      valid: false
    });
  }
};

// Create admin user (modified to allow up to MAX_ADMIN_USERS admins)
exports.createAdminUser = async (adminData) => {
  try {
    // Check how many admin users already exist
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    
    if (adminCount >= MAX_ADMIN_USERS) {
      console.log(`Maximum number of admin users (${MAX_ADMIN_USERS}) has been reached`);
      return { 
        success: false, 
        message: `Maximum number of admin users (${MAX_ADMIN_USERS}) has been reached`
      };
    }
    
    // Check if an admin with this email already exists
    const existingAdminWithEmail = await User.findOne({ 
      email: adminData.email,
      role: 'ADMIN'
    });
    
    if (existingAdminWithEmail) {
      console.log('An admin with this email already exists');
      return { 
        success: false, 
        message: 'An admin with this email already exists'
      };
    }
    
    // Create admin user
    const admin = new User({
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      primaryPhone: adminData.phone || '0000000000',
      password: adminData.password,
      role: 'ADMIN',
      isVerified: true
    });
    
    await admin.save();
    
    console.log('Admin user created successfully');
    return { 
      success: true, 
      message: 'Admin user created successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName
      }
    };
    
  } catch (error) {
    console.error('Admin Creation Error:', error);
    return { 
      success: false, 
      message: 'Failed to create admin user',
      error: error.message
    };
  }
};

// List all admin users (new function)
exports.listAdminUsers = async () => {
  try {
    const adminUsers = await User.find({ role: 'ADMIN' })
      .select('firstName lastName email createdAt')
      .sort({ createdAt: 1 });
    
    return {
      success: true,
      adminCount: adminUsers.length,
      maxAdmins: MAX_ADMIN_USERS,
      admins: adminUsers
    };
  } catch (error) {
    console.error('Error listing admin users:', error);
    return {
      success: false,
      message: 'Failed to retrieve admin users',
      error: error.message
    };
  }
};

// Get all applications with filtering and pagination
exports.getAllApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const searchTerm = req.query.search;

    // Build dynamic query
    let query = {};
    if (status) {
      query.status = status;
    }
    if (searchTerm) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
        { 'personalInfo.email': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Fetch paginated applications
    const applications = await GrantApplication.find(query)
      .select('-documents')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total matching applications
    const total = await GrantApplication.countDocuments(query);

    res.status(200).json({
      applications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalApplications: total
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving applications', 
      error: error.message 
    });
  }
};

exports.getApplicationDetails = async (req, res) => {
  try {
    const application = await GrantApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving application details', 
      error: error.message 
    });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const application = await GrantApplication.findByIdAndUpdate(
      id, 
      { 
        status, 
        adminNotes 
      }, 
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating application status', 
      error: error.message 
    });
  }
};

exports.generateReports = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build query for report
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) {
      query.status = status;
    }

    // Aggregate report data
    const report = await GrantApplication.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          totalApplications: { $sum: 1 },
          totalFundingRequested: { $sum: '$fundingInfo.fundingAmount' },
          averageFundingAmount: { $avg: '$fundingInfo.fundingAmount' }
        }
      }
    ]);

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

// Export generateAdminToken for use in other files if needed
module.exports.generateAdminToken = generateAdminToken;