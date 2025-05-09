const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Import admin controllers (to be implemented)
const {
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  getDashboardStats
} = require('../controllers/adminController');

// All routes here require authentication and admin privileges
router.use(protect);
router.use(isAdmin);

// Dashboard stats
router.get('/dashboard', getDashboardStats);

// Application management
router.get('/applications', getAllApplications);
router.get('/applications/:id', getApplicationById);
router.patch('/applications/:id/status', updateApplicationStatus);

module.exports = router;