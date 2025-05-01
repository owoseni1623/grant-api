const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Define the Application Schema if it doesn't exist already
// Make sure to create this model in your models directory
let Application;
try {
  Application = mongoose.model('Application');
} catch {
  const ApplicationSchema = new mongoose.Schema({
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      ssn: { type: String, required: true },
      gender: String,
      ethnicity: String
    },
    employmentInfo: {
      employmentStatus: String,
      incomeLevel: String,
      educationLevel: String,
      citizenshipStatus: String
    },
    addressInfo: {
      streetAddress: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true }
    },
    fundingInfo: {
      fundingType: { type: String, required: true },
      fundingAmount: { type: Number, required: true },
      fundingPurpose: String,
      timeframe: String
    },
    documents: {
      idCardFront: String,
      idCardBack: String
    },
    agreeToCommunication: Boolean,
    termsAccepted: { type: Boolean, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    statusHistory: [{
      status: String,
      changedBy: mongoose.Schema.Types.ObjectId,
      changedAt: Date
    }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }, { timestamps: true });

  Application = mongoose.model('Application', ApplicationSchema);
}

// Create new application
exports.createApplication = async (req, res) => {
  try {
    // Handle basic validation
    if (!req.body.firstName || !req.body.email) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: {
          firstName: !req.body.firstName ? 'First name is required' : undefined,
          email: !req.body.email ? 'Email is required' : undefined
        }
      });
    }

    // Get files from multer
    const idCardFront = req.files?.idCardFront?.[0]?.path;
    const idCardBack = req.files?.idCardBack?.[0]?.path;

    // Create new application document
    const newApplication = new Application({
      personalInfo: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        dateOfBirth: req.body.dateOfBirth,
        ssn: req.body.ssn,
        gender: req.body.gender,
        ethnicity: req.body.ethnicity
      },
      employmentInfo: {
        employmentStatus: req.body.employmentStatus,
        incomeLevel: req.body.incomeLevel,
        educationLevel: req.body.educationLevel,
        citizenshipStatus: req.body.citizenshipStatus
      },
      addressInfo: {
        streetAddress: req.body.streetAddress,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip
      },
      fundingInfo: {
        fundingType: req.body.fundingType,
        fundingAmount: parseFloat(req.body.fundingAmount),
        fundingPurpose: req.body.fundingPurpose,
        timeframe: req.body.timeframe
      },
      documents: {
        idCardFront,
        idCardBack
      },
      agreeToCommunication: req.body.agreeToCommunication === 'true',
      termsAccepted: req.body.termsAccepted === 'true',
      userId: req.user?.userId // Link to authenticated user
    });

    // Save to database
    const savedApplication = await newApplication.save();

    // Send successful response
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: savedApplication._id
    });
  } catch (error) {
    console.error('Application creation error:', error);
    res.status(500).json({
      message: 'Error submitting application',
      error: error.message
    });
  }
};

// Get user's applications
exports.getUserApplications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const applications = await Application.find({ userId })
      .sort({ createdAt: -1 })
      .select('_id status fundingInfo.fundingType createdAt');
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({
      message: 'Error retrieving your applications',
      error: error.message
    });
  }
};

// Get application by ID
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }
    
    // Check if user is authorized (admin or the application owner)
    if (!req.user.isAdmin && application.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: 'Not authorized to view this application'
      });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      message: 'Error retrieving application',
      error: error.message
    });
  }
};

// Get all applications (admin only)
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .sort({ createdAt: -1 }); // Newest first
      
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      message: 'Server error fetching applications',
      error: error.message
    });
  }
};

// Update application status (admin only)
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate status
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({
      message: 'Invalid status. Must be PENDING, APPROVED, or REJECTED'
    });
  }
  
  try {
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }
    
    // Update status
    application.status = status;
    
    // Add status history
    application.statusHistory = application.statusHistory || [];
    application.statusHistory.push({
      status,
      changedBy: req.user.userId,
      changedAt: new Date()
    });
    
    await application.save();
    
    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      message: 'Server error updating application status',
      error: error.message
    });
  }
};