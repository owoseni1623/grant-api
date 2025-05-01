const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import middleware for authentication
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Import the controller
const applicationController = require('../controllers/applicationController');

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

// Create new application
router.post('/', protect, uploadFields, applicationController.createApplication);

// Get user's own applications
router.get('/user', protect, applicationController.getUserApplications);

// Get application by ID (authorized users only)
router.get('/:id', protect, applicationController.getApplicationById);

// Admin routes - get all applications
router.get('/admin/all', protect, adminOnly, applicationController.getAllApplications);

// Admin routes - update application status
router.put('/admin/:id/status', protect, adminOnly, applicationController.updateApplicationStatus);

module.exports = router;