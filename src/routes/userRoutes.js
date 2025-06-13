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
// Modified to handle both JSON and multipart requests
router.put('/profile', (req, res, next) => {
  // Check if the request is multipart (has file upload)
  const contentType = req.get('Content-Type');
  
  if (contentType && contentType.includes('multipart/form-data')) {
    // Apply multer middleware for file uploads
    uploadAvatar(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  } else {
    // Skip multer for JSON requests
    next();
  }
}, updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', changePassword);

module.exports = router;