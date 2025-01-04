const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
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
    if (!req.body[field] || req.body[field].trim() === '') {
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
    if (!req.body[field] || req.body[field].trim() === '') {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });

  // Funding Validation
  if (!req.body.fundingType || req.body.fundingType.trim() === '') {
    errors.fundingType = 'Funding type is required';
  }
  
  if (!req.body.fundingAmount || parseFloat(req.body.fundingAmount) <= 0) {
    errors.fundingAmount = 'Invalid funding amount';
  }

  // File Validation
  if (!req.files || !req.files.idCardFront || !req.files.idCardBack) {
    errors.documents = 'Both front and back ID card images are required';
  }

  // Terms Acceptance
  if (!req.body.termsAccepted) {
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
        agreeToCommunication, termsAccepted
      } = req.body;

      // Create new grant application
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
          idCardFront: req.files.idCardFront[0].path,
          idCardBack: req.files.idCardBack[0].path
        },
        agreeToCommunication,
        termsAccepted,
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
      submissionDate: application.createdAt
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving application status', 
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
    }).select('_id status fundingInfo.fundingType createdAt');

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving user applications', 
      error: error.message 
    });
  }
};

// Grant Listing Methods

// Get all grants
exports.getAllGrants = async (req, res) => {
  try {
    const grants = await Grant.find({})
      .sort({ createdAt: -1 })
      .select('title description category amount deadline status');
    
    res.status(200).json(grants);
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
    const grants = await Grant.find({ 
      category: { $regex: new RegExp(category, 'i') }
    })
    .sort({ createdAt: -1 })
    .select('title description category amount deadline status');

    res.status(200).json(grants);
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
    const { q } = req.query;
    const searchQuery = q ? {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    } : {};

    const grants = await Grant.find(searchQuery)
      .sort({ createdAt: -1 })
      .select('title description category amount deadline status');

    res.status(200).json(grants);
  } catch (error) {
    console.error('Error searching grants:', error);
    res.status(500).json({ 
      message: 'Error searching grants', 
      error: error.message 
    });
  }
};