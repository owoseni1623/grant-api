// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const env = require('../../env-config');
// const config = require('../../src/config/config');

// // Use a consistent approach to get JWT_SECRET - prefer env-config but fall back to process.env
// const getJwtSecret = () => {
//   // First try env-config
//   if (env && env.JWT_SECRET) {
//     return env.JWT_SECRET;
//   }
  
//   // Then try process.env
//   if (process.env.JWT_SECRET) {
//     return process.env.JWT_SECRET;
//   }
  
//   // If in development, provide a warning but allow a fallback
//   if (process.env.NODE_ENV !== 'production') {
//     console.warn('⚠️ JWT_SECRET not found in environment, using fallback value');
//     return 'fallback_jwt_secret_for_development_only';
//   }
  
//   // In production, this is a critical error
//   console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in production!');
//   throw new Error('JWT_SECRET environment variable is required in production');
// };

// /**
//  * Middleware to protect routes by verifying JWT token
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// exports.protect = async (req, res, next) => {
//   let token;
  
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     try {
//       // Extract token from Authorization header
//       token = req.headers.authorization.split(' ')[1];
      
//       // Verify token using consistent JWT_SECRET 
//       const decoded = jwt.verify(token, getJwtSecret());
      
//       // Find user by ID from token and exclude password field
//       const user = await User.findById(decoded.userId).select('-password');
      
//       if (!user) {
//         return res.status(401).json({ message: 'Not authorized, user not found' });
//       }
      
//       // Add user info to request object
//       req.user = {
//         userId: user._id,
//         role: user.role,
//         email: user.email
//       };
      
//       next();
//     } catch (error) {
//       console.error('Authentication Error:', error);
      
//       if (error.name === 'JsonWebTokenError') {
//         return res.status(401).json({ message: 'Invalid token' });
//       }
//       if (error.name === 'TokenExpiredError') {
//         return res.status(401).json({ message: 'Token expired' });
//       }
      
//       res.status(401).json({ message: 'Not authorized' });
//     }
//   } else {
//     return res.status(401).json({ message: 'Not authorized, no token provided' });
//   }
// };

// /**
//  * Middleware to check if user has admin role
//  * Must be used after protect middleware
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// exports.isAdmin = async (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({ message: 'User not authenticated' });
//   }
  
//   try {
//     // Get fresh user data to ensure role is up to date
//     const user = await User.findById(req.user.userId);
    
//     if (!user || user.role !== 'ADMIN') {
//       return res.status(403).json({ message: 'Access denied, admin privileges required' });
//     }
    
//     next();
//   } catch (error) {
//     console.error('Admin Authorization Error:', error);
//     res.status(500).json({ message: 'Server error in admin authorization' });
//   }
// };

// /**
//  * Middleware for admin token verification (Admin model)
//  * Use when admins are stored in a separate collection
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// exports.verifyAdminToken = async (req, res, next) => {
//   let token;
  
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     try {
//       // Extract token from Authorization header
//       token = req.headers.authorization.split(' ')[1];
      
//       // Verify token using consistent approach
//       const decoded = jwt.verify(token, getJwtSecret());
      
//       // Check if user has admin role
//       if (decoded.role !== 'ADMIN') {
//         return res.status(403).json({ message: 'Not authorized as admin' });
//       }
      
//       // Find admin by ID
//       const admin = await User.findById(decoded.userId).select('-password');
      
//       if (!admin || admin.role !== 'ADMIN') {
//         return res.status(401).json({ message: 'Admin not found or invalid permissions' });
//       }
      
//       // Add admin info to request
//       req.user = {
//         userId: admin._id,
//         role: admin.role,
//         email: admin.email
//       };
      
//       next();
//     } catch (error) {
//       console.error('Admin Authentication Error:', error);
      
//       if (error.name === 'JsonWebTokenError') {
//         return res.status(401).json({ message: 'Invalid admin token' });
//       }
//       if (error.name === 'TokenExpiredError') {
//         return res.status(401).json({ message: 'Admin token expired' });
//       }
      
//       res.status(401).json({ message: 'Not authorized as admin' });
//     }
//   } else {
//     return res.status(401).json({ message: 'Admin access denied, no token provided' });
//   }
// };

// /**
//  * Legacy auth middleware for backward compatibility
//  * Attaches full user details to req.userDetails
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// exports.authMiddleware = async (req, res, next) => {
//   let token;
  
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     try {
//       // Extract token from Authorization header
//       token = req.headers.authorization.split(' ')[1];
      
//       // Verify token using consistent approach
//       const decoded = jwt.verify(token, getJwtSecret());
      
//       // Find user by ID and exclude password
//       const user = await User.findById(decoded.userId).select('-password');
      
//       if (!user) {
//         return res.status(401).json({ message: 'User not found' });
//       }
      
//       // Add both decoded token and user details to request
//       req.user = decoded;
//       req.userDetails = user;
      
//       next();
//     } catch (error) {
//       console.error('Auth Middleware Error:', error);
      
//       if (error.name === 'JsonWebTokenError') {
//         return res.status(401).json({ message: 'Invalid token' });
//       }
//       if (error.name === 'TokenExpiredError') {
//         return res.status(401).json({ message: 'Token expired' });
//       }
      
//       res.status(401).json({ message: 'Token is not valid' });
//     }
//   } else {
//     return res.status(401).json({ message: 'Not authorized, no token provided' });
//   }
// };

// /**
//  * Middleware to check if user is an admin (role-based)
//  * Must be used after authMiddleware
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// exports.adminMiddleware = async (req, res, next) => {
//   try {
//     if (!req.userDetails || req.userDetails.role !== 'ADMIN') {
//       return res.status(403).json({ message: 'Access denied, admin role required' });
//     }
    
//     next();
//   } catch (error) {
//     console.error('Admin Middleware Error:', error);
//     res.status(500).json({ message: 'Server error in admin verification' });
//   }
// };

// module.exports = exports;




const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// Utility function to generate a secure secret
const generateSecureSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Robust JWT secret retrieval
const getJwtSecret = () => {
  // Check process.env first
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  // Development fallback with warning
  if (process.env.NODE_ENV !== 'production') {
    const fallbackSecret = generateSecureSecret();
    console.warn('⚠️ JWT_SECRET not found. Generated a temporary development secret.');
    return fallbackSecret;
  }
  
  // Critical error in production
  throw new Error('CRITICAL: JWT_SECRET must be set in production environment');
};

/**
 * Base authentication middleware to verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    // Find user and attach to request
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean(); // Use .lean() for performance

    if (!user) {
      return res.status(401).json({ 
        message: 'Authentication failed',
        error: 'User not found'
      });
    }

    // Attach user information to request
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Token Authentication Error:', error);

    // Specific error handling
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        error: 'Token verification failed'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        error: 'Please log in again'
      });
    }

    // Generic authentication error
    res.status(401).json({ 
      message: 'Authentication failed',
      error: error.message 
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Middleware function
 */
const authorizeRoles = (allowedRoles) => {
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
const adminOnly = authorizeRoles(['ADMIN']);

/**
 * User-only access middleware
 */
const userOnly = authorizeRoles(['USER']);

/**
 * Optional token verification middleware
 * Attaches user info if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token, continue without user context
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();

    if (user) {
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    // Invalid token, continue without user context
    next();
  }
};

/**
 * Rate limiting middleware (basic implementation)
 * @param {Object} options - Configuration for rate limiting
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later'
  } = options;

  // In-memory store for tracking requests (replace with Redis in production)
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    // Clean up old entries
    const windowStart = now - windowMs;
    
    // Get or initialize request history for this IP
    const ipRequests = requests.get(ip) || [];
    const recentRequests = ipRequests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= max) {
      return res.status(429).json({ 
        message,
        error: 'Rate limit exceeded'
      });
    }
    
    // Add current request timestamp
    recentRequests.push(now);
    requests.set(ip, recentRequests);
    
    next();
  };
};

/**
 * Logging middleware for tracking request details
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log original methods to capture response
  const originalJson = res.json;
  const originalSend = res.send;
  
  res.json = function(body) {
    res.locals.body = body;
    return originalJson.call(this, body);
  };
  
  res.send = function(body) {
    res.locals.body = body;
    return originalSend.call(this, body);
  };
  
  // Hook into response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      user: req.user ? req.user.email : 'anonymous',
      status: res.statusCode,
      duration: `${duration}ms`
    }));
  });
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  adminOnly,
  userOnly,
  optionalAuth,
  rateLimit,
  requestLogger,
  getJwtSecret
};