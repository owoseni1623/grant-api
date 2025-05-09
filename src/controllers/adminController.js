const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Application = require('../models/Application');
const path = require('path');
const fs = require('fs');

// JWT Secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
// JWT expiration (default: 1 day)
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

/**
 * @desc    Login admin and get token
 * @route   POST /api/admin/login
 * @access  Public
 */
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for username and password
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Check for admin
    const admin = await Admin.findOne({ username }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { 
        adminId: admin._id,
        username: admin.username,
        isAdmin: true 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

/**
 * @desc    Verify admin token
 * @route   GET /api/admin/verify
 * @access  Private (Admin)
 */
const verifyAdminToken = async (req, res) => {
  // If middleware passed, token is valid
  res.status(200).json({ valid: true, admin: req.admin });
};

/**
 * @desc    Get all applications
 * @route   GET /api/admin/applications
 * @access  Private (Admin)
 */
const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.status(200).json(applications);
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
};

/**
 * @desc    Get application details by ID
 * @route   GET /api/admin/applications/:id
 * @access  Private (Admin)
 */
const getApplicationDetails = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json(application);
  } catch (error) {
    console.error('Get Application Details Error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(500).json({ message: 'Server error while fetching application details' });
  }
};

/**
 * @desc    Update application status
 * @route   PUT /api/admin/applications/:id/status
 * @access  Private (Admin)
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    application.status = status;
    await application.save();
    
    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      application
    });
  } catch (error) {
    console.error('Update Application Status Error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(500).json({ message: 'Server error while updating application status' });
  }
};

/**
 * @desc    Access application documents
 * @route   GET /api/admin/documents/:documentPath
 * @access  Private (Admin)
 */
const getDocument = async (req, res) => {
  try {
    const documentPath = req.params.documentPath;
    const fullPath = path.join(process.env.DOCUMENT_STORAGE_PATH || 'uploads', documentPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Return the file
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Document Access Error:', error);
    res.status(500).json({ message: 'Server error while accessing document' });
  }
};

/**
 * @desc    Generate application reports
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
const generateReports = async (req, res) => {
  try {
    // Count applications by status
    const statusCounts = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get total funding amount requested
    const totalFunding = await Application.aggregate([
      { $group: { _id: null, total: { $sum: '$fundingInfo.fundingAmount' } } }
    ]);
    
    // Get applications by funding type
    const fundingTypes = await Application.aggregate([
      { $group: { _id: '$fundingInfo.fundingType', count: { $sum: 1 }, totalAmount: { $sum: '$fundingInfo.fundingAmount' } } }
    ]);
    
    // Applications over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const applicationsByDay = await Application.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      statusCounts,
      totalFunding: totalFunding.length > 0 ? totalFunding[0].total : 0,
      fundingTypes,
      applicationsByDay
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ message: 'Server error while generating reports' });
  }
};

module.exports = {
  loginAdmin,
  verifyAdminToken,
  getAllApplications,
  getApplicationDetails,
  updateApplicationStatus,
  getDocument,
  generateReports
};