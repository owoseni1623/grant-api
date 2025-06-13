const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with user ID and timestamp
    const uniqueSuffix = `${req.user.userId}-${Date.now()}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${fileExt}`);
  }
});

// File filter function to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
  console.log('File filter - mimetype:', file.mimetype);
  console.log('File filter - originalname:', file.originalname);
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // Check both mimetype and file extension
  const isValidMimeType = allowedTypes.includes(file.mimetype);
  const fileExt = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedExtensions.includes(fileExt);
  
  // Also check if it's an image based on the file extension if mimetype is generic
  const isGenericMimeType = file.mimetype === 'application/octet-stream' || file.mimetype === 'binary/octet-stream';
  
  if (isValidMimeType || (isGenericMimeType && isValidExtension) || isValidExtension) {
    console.log('File accepted');
    cb(null, true);
  } else {
    console.log('File rejected - Invalid type');
    cb(new Error(`Invalid file type. Only image files (jpeg, jpg, png, gif, webp) are allowed. Received: ${file.mimetype}`), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Enhanced multer error handler
const handleMulterError = (error, req, res, next) => {
  console.error('Multer error details:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          message: 'File too large',
          details: 'Maximum file size is 5MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          message: 'Too many files',
          details: 'Only one file allowed'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          message: 'Unexpected file field',
          details: 'File field name should be "avatar"'
        });
      default:
        return res.status(400).json({ 
          message: 'File upload error',
          details: error.message
        });
    }
  } else if (error) {
    return res.status(400).json({ 
      message: 'Invalid file upload',
      details: error.message
    });
  }
  next();
};

// Get complete user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      message: 'Server error fetching profile data',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get existing user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fields that can be updated
    const {
      firstName,
      lastName,
      primaryPhone,
      mobilePhone,
      bio,
      organization,
      position
    } = req.body;
    
    // Validate required fields
    if (firstName !== undefined && (!firstName || firstName.trim().length < 2)) {
      return res.status(400).json({ 
        message: 'Validation Error',
        details: 'First name must be at least 2 characters long'
      });
    }
    
    if (lastName !== undefined && (!lastName || lastName.trim().length < 2)) {
      return res.status(400).json({ 
        message: 'Validation Error',
        details: 'Last name must be at least 2 characters long'
      });
    }
    
    if (primaryPhone !== undefined && (!primaryPhone || primaryPhone.trim().length === 0)) {
      return res.status(400).json({ 
        message: 'Validation Error',
        details: 'Primary phone is required'
      });
    }
    
    // Update fields if provided
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (primaryPhone !== undefined) user.primaryPhone = primaryPhone.trim();
    if (mobilePhone !== undefined) user.mobilePhone = mobilePhone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (organization !== undefined) user.organization = organization.trim();
    if (position !== undefined) user.position = position.trim();
    
    // Handle avatar upload from multer (only if file was uploaded)
    if (req.file) {
      console.log('File uploaded:', req.file);
      
      // Delete previous avatar file if exists
      if (user.avatar) {
        const previousAvatarPath = path.join(__dirname, '../../', user.avatar);
        if (fs.existsSync(previousAvatarPath)) {
          try {
            fs.unlinkSync(previousAvatarPath);
            console.log('Previous avatar deleted:', previousAvatarPath);
          } catch (deleteError) {
            console.warn('Could not delete previous avatar:', deleteError.message);
          }
        }
      }
      
      // Set new avatar path (relative to the project root)
      user.avatar = path.relative(path.join(__dirname, '../../'), req.file.path);
      console.log('New avatar path set:', user.avatar);
    }
    
    // Save updated user
    await user.save();
    console.log('User profile updated successfully');
    
    // Return updated user info using the model's toJSON method
    const userResponse = user.toJSON();
    
    res.json(userResponse);
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        message: 'Validation Error',
        errors
      });
    }
    
    // Handle multer errors that might not be caught by the middleware
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large',
        details: 'Maximum file size is 5MB'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error updating profile',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      message: 'All password fields are required'
    });
  }
  
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      message: 'New passwords must match'
    });
  }
  
  try {
    // Get user with password
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    
    // Handle validation errors on the new password
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        message: 'Password validation error',
        errors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error changing password',
      error: error.message
    });
  }
};

// Helper function for file upload
exports.uploadAvatar = upload.single('avatar');
exports.handleMulterError = handleMulterError;