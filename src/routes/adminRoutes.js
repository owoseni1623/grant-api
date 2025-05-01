// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const documentController = require('../controllers/documentController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Wrapper function to handle async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Admin authentication routes
router.post('/login', asyncHandler(adminController.loginAdmin));

// Verify token route
router.get('/verify-token', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.verifyAdminToken)
);

// Application management routes (protected)
router.get('/applications', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.getAllApplications)
);

// Route for getting application details
router.get('/applications/:id', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.getApplicationDetails)
);

// Route for updating application status
router.patch('/applications/:id/status', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.updateApplicationStatus)
);

// Alternative route for updating status
router.put('/applications/:id/status', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.updateApplicationStatus)
);

// Route for generating reports
router.get('/reports', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(adminController.generateReports)
);

// Document download route - make sure documentController.downloadDocument exists
router.get('/documents/:path', 
  authMiddleware, 
  adminMiddleware, 
  asyncHandler(documentController.downloadDocument)
);

module.exports = router;