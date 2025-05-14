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
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'), false);
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

// Handle multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large',
        details: 'Maximum file size is 5MB'
      });
    }
    return res.status(400).json({ 
      message: 'File upload error',
      details: error.message
    });
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
    const user = await User.findById(req.user.userId).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    // If avatar path exists, convert to full URL
    if (user.avatar) {
      // Check if the avatar is already a full URL
      if (!user.avatar.startsWith('http')) {
        // Base URL from environment or default
        const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        user.avatar = `${baseUrl}/${user.avatar.replace(/\\/g, '/')}`;
      }
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
  // Multer middleware is called before this controller function
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
    
    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (primaryPhone) user.primaryPhone = primaryPhone;
    if (mobilePhone !== undefined) user.mobilePhone = mobilePhone;
    if (bio !== undefined) user.bio = bio;
    if (organization !== undefined) user.organization = organization;
    if (position !== undefined) user.position = position;
    
    // Handle avatar upload from multer
    if (req.file) {
      // Delete previous avatar file if exists
      if (user.avatar) {
        const previousAvatarPath = path.join(__dirname, '../../', user.avatar);
        if (fs.existsSync(previousAvatarPath)) {
          fs.unlinkSync(previousAvatarPath);
        }
      }
      
      // Set new avatar path (relative to the project root)
      user.avatar = path.relative(path.join(__dirname, '../../'), req.file.path);
    } else if (req.body.avatar === '') {
      // If empty string provided, remove avatar
      if (user.avatar) {
        const avatarPath = path.join(__dirname, '../../', user.avatar);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }
      user.avatar = null;
    }
    
    // Save updated user
    await user.save();
    
    // If avatar exists, convert to full URL for response
    if (user.avatar) {
      // Check if the avatar is already a full URL
      if (!user.avatar.startsWith('http')) {
        // Base URL from environment or default
        const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        user.avatar = `${baseUrl}/${user.avatar.replace(/\\/g, '/')}`;
      }
    }
    
    // Return updated user info
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      primaryPhone: user.primaryPhone,
      mobilePhone: user.mobilePhone,
      bio: user.bio,
      organization: user.organization,
      position: user.position,
      avatar: user.avatar,
      role: user.role,
      updatedAt: user.updatedAt
    });
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