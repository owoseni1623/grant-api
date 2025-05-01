// const express = require('express');
// const router = express.Router();
// const grantApplicationController = require('../controllers/grantApplicationController');

// // Application routes
// router.post('/submit', grantApplicationController.submitGrantApplication);
// router.get('/status/:applicationId', grantApplicationController.getGrantApplicationStatus);
// router.get('/user-applications', grantApplicationController.getUserApplications);

// // Grant listing routes
// router.get('/all', grantApplicationController.getAllGrants);
// router.get('/category/:category', grantApplicationController.getGrantsByCategory);
// router.get('/search', grantApplicationController.searchGrants);

// module.exports = router;



const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Upload fields for ID card documents
const uploadFields = upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]);

// Import the controller directly from paste.txt
// This avoids any import path issues
const grantApplicationController = {
  submitGrantApplication: (req, res) => {
    uploadFields(req, res, async (uploadError) => {
      // Handle multer upload errors
      if (uploadError) {
        return res.status(400).json({ 
          message: 'File upload error',
          error: uploadError.message 
        });
      }

      try {
        // Basic validation for demonstration
        if (!req.body.firstName || !req.body.email) {
          return res.status(400).json({
            message: 'Validation failed',
            errors: { 
              firstName: !req.body.firstName ? 'First name is required' : undefined,
              email: !req.body.email ? 'Email is required' : undefined
            }
          });
        }

        // Mock successful response
        res.status(201).json({
          message: 'Grant application submitted successfully',
          applicationId: 'temp-' + Date.now()
        });
      } catch (error) {
        console.error('Submission Error:', error);
        res.status(500).json({ 
          message: 'Internal server error', 
          error: error.message 
        });
      }
    });
  },

  getGrantApplicationStatus: async (req, res) => {
    try {
      const { applicationId } = req.params;
      
      // Mock response
      res.status(200).json({
        applicationId: applicationId,
        status: 'PENDING',
        fundingType: 'Business Grant',
        submissionDate: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error retrieving application status', 
        error: error.message 
      });
    }
  },

  getUserApplications: async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Mock response
      res.status(200).json([{
        _id: 'mock-id-1',
        status: 'PENDING',
        fundingInfo: { fundingType: 'Business' },
        createdAt: new Date()
      }]);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error retrieving user applications', 
        error: error.message 
      });
    }
  },

  getAllGrants: async (req, res) => {
    try {
      // Mock response
      res.status(200).json([{
        title: 'Small Business Grant',
        description: 'Support for small businesses',
        category: 'Business',
        amount: 5000,
        deadline: new Date(2025, 8, 1),
        status: 'ACTIVE'
      }]);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching grants', 
        error: error.message 
      });
    }
  },

  getGrantsByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      
      // Mock response
      res.status(200).json([{
        title: `${category} Grant`,
        description: `Support for ${category}`,
        category: category,
        amount: 5000,
        deadline: new Date(2025, 8, 1),
        status: 'ACTIVE'
      }]);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching grants by category', 
        error: error.message 
      });
    }
  },

  searchGrants: async (req, res) => {
    try {
      const { q } = req.query;
      
      // Mock response
      res.status(200).json([{
        title: `Grant matching "${q}"`,
        description: 'Search result',
        category: 'Various',
        amount: 5000,
        deadline: new Date(2025, 8, 1),
        status: 'ACTIVE'
      }]);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error searching grants', 
        error: error.message 
      });
    }
  }
};

// Grant application routes
router.post('/submit', grantApplicationController.submitGrantApplication);
router.get('/status/:applicationId', grantApplicationController.getGrantApplicationStatus);
router.get('/user-applications', grantApplicationController.getUserApplications);

// Grant listing routes
router.get('/all', grantApplicationController.getAllGrants);
router.get('/category/:category', grantApplicationController.getGrantsByCategory);
router.get('/search', grantApplicationController.searchGrants);

module.exports = router;