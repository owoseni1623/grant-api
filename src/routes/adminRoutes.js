const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const documentController = require('../controllers/documentController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// IMPORTANT: This route should NOT have authMiddleware since we're trying to log in
router.post('/login', asyncHandler(adminController.loginAdmin));

// Protected routes below
router.get('/verify-token', authMiddleware, adminMiddleware, asyncHandler(adminController.verifyAdminToken));
router.get('/applications', authMiddleware, adminMiddleware, asyncHandler(adminController.getAllApplications));
router.get('/applications/:id', authMiddleware, adminMiddleware, asyncHandler(adminController.getApplicationDetails));
router.patch('/applications/:id/status', authMiddleware, adminMiddleware, asyncHandler(adminController.updateApplicationStatus));
router.put('/applications/:id/status', authMiddleware, adminMiddleware, asyncHandler(adminController.updateApplicationStatus));
router.get('/reports', authMiddleware, adminMiddleware, asyncHandler(adminController.generateReports));
router.get('/documents/:path', authMiddleware, adminMiddleware, asyncHandler(documentController.downloadDocument));

module.exports = router;