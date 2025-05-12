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

// Import the middleware from the updated authMiddleware file
const { 
  authenticateToken, 
  adminOnly, 
  protect, 
  isAdmin,
  authMiddleware,
  adminMiddleware
} = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);         
router.post('/admin/login', adminLogin);  
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes - you can use either authenticateToken or protect (they're aliases)
router.get('/profile', authenticateToken, getUserProfile);

// Admin routes - you can use either adminOnly or isAdmin (they're aliases)
router.post('/admin/create', createAdminUser);  
router.get('/admin/users', authenticateToken, adminOnly, getAllUsers);

module.exports = router;