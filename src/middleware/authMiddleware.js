const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// JWT Secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare input password with stored hashed password
 * @param {string} inputPassword - Plain text password
 * @param {string} storedPassword - Hashed password from database
 * @returns {Promise<boolean>} Password match result
 */
const comparePassword = async (inputPassword, storedPassword) => {
  return await bcrypt.compare(inputPassword, storedPassword);
};

/**
 * Generate JWT token for a user
 * @param {string} userId - User's unique identifier
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Middleware to protect routes and authenticate users
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
  }

  // If no token is present
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = async (req, res, next) => {
  try {
    // Assuming you have an admin flag in your User model
    const user = await User.findById(req.user.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin Check Error:', error);
    res.status(500).json({ 
      message: 'Server error during admin verification', 
      error: error.message 
    });
  }
};

/**
 * Middleware to rate limit sensitive operations
 */
const rateLimitAuth = (req, res, next) => {
  // This is a simple in-memory rate limiter
  // In production, use a more robust solution like Redis
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Create a unique key based on IP or user ID
  const key = req.ip || req.user.userId;

  // Check if this key exists in our tracking
  if (!global.authAttempts) global.authAttempts = {};
  
  const attempts = global.authAttempts[key] || { count: 0, lastAttempt: Date.now() };

  // Reset if outside the time window
  if (Date.now() - attempts.lastAttempt > WINDOW_MS) {
    attempts.count = 0;
  }

  attempts.count++;
  attempts.lastAttempt = Date.now();
  global.authAttempts[key] = attempts;

  if (attempts.count > MAX_ATTEMPTS) {
    return res.status(429).json({ 
      message: 'Too many attempts. Please try again later.' 
    });
  }

  next();
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  protect,
  isAdmin,
  rateLimitAuth
};