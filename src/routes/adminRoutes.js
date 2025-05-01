const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Wrapper function to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Admin authentication routes
router.post('/login', asyncHandler(adminController.loginAdmin));
router.get('/verify-token', authMiddleware, adminMiddleware, asyncHandler(adminController.verifyAdminToken));

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

// Alternative route for updating status (from second route file)
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

// This route was in the second routes file but controller isn't implemented yet
router.get('/documents/:path', authMiddleware, adminMiddleware, (req, res) => {
  // This will be implemented in documentController
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;