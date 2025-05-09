const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin'); // Assuming you have an Admin model

// JWT Secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Middleware to protect routes and authenticate regular users
 */
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
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
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to verify admin tokens specifically
 * This aligns with how your AdminPanel.js expects authentication to work
 */
const verifyAdminToken = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if this is an admin token
      if (!decoded.isAdmin) {
        return res.status(403).json({ message: 'Not authorized as admin' });
      }
      
      // Find admin by ID
      const admin = await Admin.findById(decoded.adminId);
      
      if (!admin) {
        return res.status(401).json({ message: 'Admin not found' });
      }
      
      // Attach admin info to request
      req.admin = {
        adminId: admin._id,
        username: admin.username
      };
      
      next();
    } catch (error) {
      console.error('Admin Authorization Error:', error);
      
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
 * Legacy middleware - use only if needed for backward compatibility
 */
const authMiddleware = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      req.user = decoded;
      req.userDetails = user;
      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      res.status(401).json({ message: 'Token is not valid' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to check if user is an admin (role-based approach)
 * Note: This is different from verifyAdminToken and should only be used
 * if your admin users are in the same collection as regular users
 */
const adminMiddleware = async (req, res, next) => {
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

module.exports = {
  protect,
  authMiddleware,
  adminMiddleware,
  verifyAdminToken  // Export the new middleware
};