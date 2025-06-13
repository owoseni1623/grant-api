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
router.put('/profile', (req, res, next) => {
  const contentType = req.get('Content-Type');
  
  // Check if this is a multipart request (file upload)
  if (contentType && contentType.startsWith('multipart/form-data')) {
    // Use multer for file uploads
    uploadAvatar(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return handleMulterError(err, req, res, next);
      }
      // Continue to updateProfile controller
      updateProfile(req, res);
    });
  } else {
    // Handle JSON requests directly
    updateProfile(req, res);
  }
});

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', changePassword);

module.exports = router;