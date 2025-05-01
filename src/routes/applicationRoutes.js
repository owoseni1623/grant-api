const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import middleware for authentication
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Import the controller
// Make sure the path is correct and the file exists
const applicationController = require('../controllers/applicationController');

// Debug to check if controller functions exist
console.log('Controller functions available:', Object.keys(applicationController));

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

// Define fallback handlers in case there's an issue with the controller
const fallbackHandler = (req, res) => {
  res.status(501).json({ message: 'Route handler not properly implemented' });
};

// Create new application
router.post('/', protect, uploadFields, 
  applicationController.createApplication || fallbackHandler);

// Get user's own applications
router.get('/user', protect, 
  applicationController.getUserApplications || fallbackHandler);

// Admin routes - Make sure these come BEFORE the /:id route
router.get('/admin/all', protect, adminOnly, 
  applicationController.getAllApplications || fallbackHandler);

// Admin routes - update application status
router.put('/admin/:id/status', protect, adminOnly, 
  applicationController.updateApplicationStatus || fallbackHandler);

// Get application by ID (authorized users only)
// This MUST come after more specific routes like /admin/all
router.get('/:id', protect, 
  applicationController.getApplicationById || fallbackHandler);

module.exports = router;