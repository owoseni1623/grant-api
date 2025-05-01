const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add user to request
    req.user = decoded;
    req.userDetails = user;
    next();
    
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin protection middleware - This combines functionality from adminProtect and adminMiddleware
exports.adminMiddleware = async (req, res, next) => {
  try {
    // Check if user has admin role from JWT
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied, admin only' });
    }
    
    // Additional check from user details
    if (req.userDetails && req.userDetails.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied, admin role required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin Middleware Error:', error);
    res.status(500).json({ message: 'Server error in admin verification' });
  }
};

// For backwards compatibility with the second code snippet
exports.adminProtect = [exports.authMiddleware, exports.adminMiddleware];

// Export default middleware
module.exports = exports;