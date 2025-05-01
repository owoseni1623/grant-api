const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const applicationController = require('../controllers/applicationController');
const multer = require('multer');
const path = require('path');

// Check if controllers exist and log them
console.log('Application Controller functions:', Object.keys(applicationController));

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

// Safe approach: only add routes where controller functions are defined
if (applicationController.createApplication) {
  router.post('/', protect, uploadFields, applicationController.createApplication);
}

if (applicationController.getUserApplications) {
  router.get('/user', protect, applicationController.getUserApplications);
}

if (applicationController.getApplicationById) {
  router.get('/:id', protect, applicationController.getApplicationById);
}

if (applicationController.getAllApplications) {
  router.get('/admin/all', protect, adminOnly, applicationController.getAllApplications);
}

if (applicationController.updateApplicationStatus) {
  router.put('/admin/:id/status', protect, adminOnly, applicationController.updateApplicationStatus);
}

// Remove the problematic grant application routes for now
// We'll handle them separately

module.exports = router;