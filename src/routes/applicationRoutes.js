const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { 
  createApplication, 
  getUserApplications,
  getApplicationById,
  getAllApplications,
  updateApplicationStatus
} = require('../controllers/applicationController');
const grantApplicationController = require('../controllers/grantApplicationController');
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

// Application routes from applicationController
router.post('/', protect, uploadFields, createApplication);
router.get('/user', protect, getUserApplications);
router.get('/:id', protect, getApplicationById);

// Admin routes for application management
router.get('/admin/all', protect, adminOnly, getAllApplications);
router.put('/admin/:id/status', protect, adminOnly, updateApplicationStatus);

// Grant application routes from grantApplicationController
router.post('/grants', grantApplicationController.submitGrantApplication);
router.get('/grants/status/:applicationId', grantApplicationController.getGrantApplicationStatus);
router.get('/grants/user', grantApplicationController.getUserApplications);
router.get('/grants', grantApplicationController.getAllGrants);
router.get('/grants/category/:category', grantApplicationController.getGrantsByCategory);
router.get('/grants/search', grantApplicationController.searchGrants);

module.exports = router;