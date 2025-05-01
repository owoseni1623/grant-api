const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Assuming you have this middleware for file uploads

// Setup file upload middleware for ID card files
const uploadFields = upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]);

// Create new application - protected route with file upload
router.post('/', 
  protect, 
  uploadFields, 
  applicationController.createApplication
);

// Get logged-in user's applications
router.get('/my-applications', 
  protect, 
  applicationController.getUserApplications
);

// Get specific application by ID
router.get('/:id', 
  protect, 
  applicationController.getApplicationById
);

// Admin routes - protected by both auth and admin middleware
// Get all applications (admin only)
router.get('/', 
  protect, 
  isAdmin, 
  applicationController.getAllApplications
);

// Update application status (admin only)
router.patch('/:id/status', 
  protect, 
  isAdmin, 
  applicationController.updateApplicationStatus
);

module.exports = router;