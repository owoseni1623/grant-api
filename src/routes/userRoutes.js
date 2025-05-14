const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  handleMulterError
} = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes in this file are protected and require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile information
 * @access  Private
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', uploadAvatar, handleMulterError, updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', changePassword);

module.exports = router;