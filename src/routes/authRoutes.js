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
  getAllUsers,
  verifyToken
} = require('../controllers/authController');

const { 
  authenticateToken, 
  adminOnly, 
  protect, 
  isAdmin,
  authMiddleware,
  adminMiddleware,
  userOnly
} = require('../middleware/authMiddleware');

//=========================================
// PUBLIC ROUTES (no authentication required)
//=========================================

// Authentication
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin/login', adminLogin);

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin creation (protected by admin secret, not JWT)
router.post('/admin/create', createAdminUser);

//=========================================
// PROTECTED ROUTES (authentication required)
//=========================================

// Token verification - used by frontend to check if token is still valid
router.get('/verify-token', authenticateToken, verifyToken);

// User profile - accessible to authenticated users
router.get('/profile', authenticateToken, getUserProfile);
router.get('/user-profile', protect, getUserProfile); // Alternative route for backward compatibility

//=========================================
// ADMIN ROUTES (admin authentication required)
//=========================================

// User management - admin only
router.get('/admin/users', adminMiddleware, getAllUsers);
router.get('/users', authenticateToken, adminOnly, getAllUsers); // Alternative route

// Export the router
module.exports = router;