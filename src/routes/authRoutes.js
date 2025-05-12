const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  adminLogin,
  getUserProfile,
  forgotPassword,
  resetPassword,
  createAdminUser,
  getAllUsers
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);         // This will handle /api/auth/login
router.post('/admin/login', adminLogin);  // This will handle /api/auth/admin/login
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, getUserProfile);

// Admin routes
router.post('/admin/create', createAdminUser); // Protected by admin secret
router.get('/admin/users', protect, isAdmin, getAllUsers);

module.exports = router;