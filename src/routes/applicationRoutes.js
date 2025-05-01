const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  createApplication, 
  getUserApplications,
  getApplicationById
} = require('../controllers/applicationController');
const { 
  createApplication, 
  getUserApplications,
  getApplicationById
} = require('../controllers/grantApplicationController');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
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

// Create new application
router.post('/', protect, uploadFields, createApplication);

// Get user's applications
router.get('/user', protect, getUserApplications);

// Get single application by ID
router.get('/:id', protect, getApplicationById);

module.exports = router;