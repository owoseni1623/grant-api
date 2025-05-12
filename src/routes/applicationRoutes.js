const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { protect, authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Wrapper function to handle async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Setup file upload middleware for ID card files
const uploadFields = upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]);

// Create new application - protected route with file upload
router.post('/', 
  protect, 
  uploadFields, 
  asyncHandler(applicationController.createApplication)
);

// Get logged-in user's applications
router.get('/my-applications', 
  protect, 
  asyncHandler(applicationController.getUserApplications)
);

// Get specific application by ID
router.get('/:id', 
  protect, 
  asyncHandler(applicationController.getApplicationById)
);

// Admin routes - protected by both auth and admin middleware
// Get all applications (admin only)
router.get('/', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(applicationController.getAllApplications)
);

// Update application status (admin only)
router.patch('/:id/status', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(applicationController.updateApplicationStatus)
);

module.exports = router;