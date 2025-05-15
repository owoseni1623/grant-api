const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../../env-config');

/**
 * Get JWT secret consistently across the application
 * Uses the same logic as in authController.js
 */
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
 * Primary authentication middleware to verify JWT token
 * Handles all error cases and provides detailed error responses
 */
exports.authenticateToken = async (req, res, next) => {
  let token;
  
  try {
    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, token missing after Bearer prefix' });
      }
      
      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());
      
      if (!decoded.userId) {
        return res.status(401).json({ message: 'Invalid token format, missing userId' });
      }
      
      // Find user by ID from token and exclude password field
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        console.warn(`User not found for token with ID: ${decoded.userId}`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      // Add user info to request object
      req.user = {
        userId: user._id,
        role: user.role,
        email: user.email
      };
      
      // For backward compatibility with legacy code
      req.userDetails = user;
      
      next();
    } else {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
  } catch (error) {
    console.error('Authentication Error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

/**
 * Role-based authorization middleware
 * Ensures the user has one of the allowed roles
 */
exports.authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No user context found'
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied',
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Admin-only access middleware
 */
exports.adminOnly = exports.authorizeRoles(['ADMIN']);

/**
 * User-only access middleware
 */
exports.userOnly = exports.authorizeRoles(['USER']);

// Alias for backward compatibility with existing code
exports.protect = exports.authenticateToken;
exports.isAdmin = exports.adminOnly;

/**
 * Combined admin middleware for cleaner routes
 * First authenticates the token, then checks for admin role
 */
exports.adminMiddleware = [exports.authenticateToken, exports.adminOnly];

/**
 * Legacy auth middleware for backward compatibility
 * Kept for compatibility with existing code that might be using it
 */
exports.authMiddleware = exports.authenticateToken;

// Export getJwtSecret for use in other modules
exports.getJwtSecret = getJwtSecret;

module.exports = exports;