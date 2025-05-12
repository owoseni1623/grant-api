const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../../env-config');
const config = require('../../src/config/config');

// Use a consistent approach to get JWT_SECRET - prefer env-config but fall back to process.env
const getJwtSecret = () => {
  // First try env-config
  if (env && env.JWT_SECRET) {
    return env.JWT_SECRET;
  }
  
  // Then try process.env
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  // If in development, provide a warning but allow a fallback
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ JWT_SECRET not found in environment, using fallback value');
    return 'fallback_jwt_secret_for_development_only';
  }
  
  // In production, this is a critical error
  console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in production!');
  throw new Error('JWT_SECRET environment variable is required in production');
};

/**
 * Middleware to protect routes by verifying JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from Authorization header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token using consistent JWT_SECRET 
      const decoded = jwt.verify(token, getJwtSecret());
      
      // Find user by ID from token and exclude password field
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      // Add user info to request object
      req.user = {
        userId: user._id,
        role: user.role,
        email: user.email
      };
      
      next();
    } catch (error) {
      console.error('Authentication Error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after protect middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  
  try {
    // Get fresh user data to ensure role is up to date
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied, admin privileges required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin Authorization Error:', error);
    res.status(500).json({ message: 'Server error in admin authorization' });
  }
};

/**
 * Middleware for admin token verification (Admin model)
 * Use when admins are stored in a separate collection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyAdminToken = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from Authorization header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token using consistent approach
      const decoded = jwt.verify(token, getJwtSecret());
      
      // Check if user has admin role
      if (decoded.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Not authorized as admin' });
      }
      
      // Find admin by ID
      const admin = await User.findById(decoded.userId).select('-password');
      
      if (!admin || admin.role !== 'ADMIN') {
        return res.status(401).json({ message: 'Admin not found or invalid permissions' });
      }
      
      // Add admin info to request
      req.user = {
        userId: admin._id,
        role: admin.role,
        email: admin.email
      };
      
      next();
    } catch (error) {
      console.error('Admin Authentication Error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid admin token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Admin token expired' });
      }
      
      res.status(401).json({ message: 'Not authorized as admin' });
    }
  } else {
    return res.status(401).json({ message: 'Admin access denied, no token provided' });
  }
};

/**
 * Legacy auth middleware for backward compatibility
 * Attaches full user details to req.userDetails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.authMiddleware = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from Authorization header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token using consistent approach
      const decoded = jwt.verify(token, getJwtSecret());
      
      // Find user by ID and exclude password
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Add both decoded token and user details to request
      req.user = decoded;
      req.userDetails = user;
      
      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      res.status(401).json({ message: 'Token is not valid' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/**
 * Middleware to check if user is an admin (role-based)
 * Must be used after authMiddleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.adminMiddleware = async (req, res, next) => {
  try {
    if (!req.userDetails || req.userDetails.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied, admin role required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin Middleware Error:', error);
    res.status(500).json({ message: 'Server error in admin verification' });
  }
};

module.exports = exports;