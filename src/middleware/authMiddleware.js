// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Middleware to protect routes and authenticate users (for regular users)
 */
const protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Find user by ID in the token, exclude password
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Attach user to the request object
      req.user = {
        userId: user._id,
        email: user.email
      };

      next();
    } catch (error) {
      console.error('Authorization Error:', error);

      // Differentiated error responses
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }

      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    // If no token is present
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware for admin routes authentication
 */
const authMiddleware = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
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
  } else {
    // If no token is present
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to check if user is an admin
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user has admin role
    if (!req.userDetails || req.userDetails.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied, admin role required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin Middleware Error:', error);
    res.status(500).json({ message: 'Server error in admin verification' });
  }
};

// Export both the original middleware for regular routes and the admin middleware
module.exports = {
  protect,
  authMiddleware,
  adminMiddleware
};