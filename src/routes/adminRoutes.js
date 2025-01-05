const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Wrapper function to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route for getting all applications
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

// Route for generating reports
router.get('/reports', 
    authMiddleware, 
    adminMiddleware, 
    asyncHandler(adminController.generateReports)
);

module.exports = router;