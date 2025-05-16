const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Import admin controllers
const {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  getDashboardStats,
  generateApplicationPDF
} = require('../controllers/adminController');

// All routes below require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles(['ADMIN']));

// Dashboard stats route
router.get('/dashboard', getDashboardStats);

// Application management routes
router.get('/applications', getAllApplications);
router.get('/applications/:id', getApplicationById);
router.patch('/applications/:id/status', updateApplicationStatus);
router.get('/applications/:id/export-pdf', generateApplicationPDF);

module.exports = router;