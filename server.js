const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection function
const { connectDB } = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const grantRoutes = require('./src/routes/grantRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Create Express app
const app = express();

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Graceful shutdown function - Define it early to avoid hoisting issues
const gracefulShutdown = async (reason) => {
  console.log(`\n🛑 Initiating graceful shutdown. Reason: ${reason}`);
  
  try {
    // Close server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('❌ Error closing server:', err);
            reject(err);
          } else {
            console.log('✅ Server closed');
            resolve();
          }
        });
      });
    }
    
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('✅ Database connection closed');
    }
    
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Comprehensive CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Production URLs
      'https://grant-app-five.vercel.app',
      'https://grant-app-five.vercel.app/',
      'grantus.net',
      'grantus.net/',
      
      // Development URLs
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3001',
      
      // Add your custom domains here
      'http://localhost:8080',
      'http://192.168.1.100:3000', // Replace with your local IP if needed
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Logging middleware (only in development)
if (isDevelopment) {
  app.use(morgan('dev'));
}

// CORS middleware
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create avatars directory inside uploads
const avatarsDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Serve static files for uploaded documents and avatars
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Advanced Environment Configuration
const validateEnvironmentVariables = () => {
  const missingCriticalVars = [];
  const criticalVars = ['JWT_SECRET'];
  
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingCriticalVars.push(varName);
    }
  });

  // If missing critical vars in production, throw error
  if (isProduction && missingCriticalVars.length > 0) {
    throw new Error(`Missing critical environment variables in production: ${missingCriticalVars.join(', ')}`);
  }

  // Generate secrets if not provided (mainly for development)
  const generateSecureSecret = () => crypto.randomBytes(64).toString('hex');

  return {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/grant-GOV',
    JWT_SECRET: process.env.JWT_SECRET || generateSecureSecret(),
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || generateSecureSecret(),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    API_URL: process.env.API_URL || null,
    ADMIN_SECRET: process.env.ADMIN_SECRET || 'default-admin-secret'
  };
};

// Validate and extract environment configuration
const ENV = validateEnvironmentVariables();

// Console output with better formatting
console.log('\n' + '='.repeat(50));
console.log(`🚀 Server starting in ${ENV.NODE_ENV} mode`);
console.log(`📍 Port: ${ENV.PORT}`);
console.log(`📦 MongoDB URI: ${ENV.MONGODB_URI ? 'Configured' : 'Not Configured'}`);
console.log(`🔐 JWT Secret: ${ENV.JWT_SECRET ? 'Available' : 'Missing'}`);
console.log(`🌐 Frontend URL: ${ENV.FRONTEND_URL}`);
console.log('='.repeat(50) + '\n');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    jwtConfigured: !!ENV.JWT_SECRET,
    mongoConfigured: !!ENV.MONGODB_URI,
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Grant Management API',
    version: '1.0.0',
    environment: ENV.NODE_ENV,
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      grants: '/api/grants',
      applications: '/api/applications',
      admin: '/api/admin'
    }
  });
});

// Database connection - Make it async
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    gracefulShutdown('Database Connection Failed');
  }
};

// Routes (keep your existing routes as they are)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/grants', grantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Simple test route
app.get('/test', (req, res) => {
  res.status(200).json({ 
    message: "API is working correctly!",
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV
  });
});

// Preflight CORS handling
app.options('*', cors(corsOptions));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);

  // Clean the error stack in production
  const error = isProduction 
    ? { message: err.message }
    : { message: err.message, stack: err.stack };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  if (err.code === 11000) { // MongoDB duplicate key error
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...error
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

// Declare server variable
let server;

// Start server
server = app.listen(ENV.PORT, async () => {
  console.log(`🌟 Server running on port ${ENV.PORT}`);
  console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
  console.log(`🔗 Local: http://localhost:${ENV.PORT}`);
  if (isDevelopment) {
    console.log(`🔗 Network: http://192.168.1.100:${ENV.PORT}`); // Replace with your actual IP
  }
  console.log(`\n📋 Available routes:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api - API information`);
  console.log(`   GET  /test - Test endpoint`);
  console.log(`   POST /api/auth/* - Authentication routes`);
  console.log(`   *    /api/users/* - User routes`);
  console.log(`   *    /api/grants/* - Grant routes`);
  console.log(`   *    /api/applications/* - Application routes`);
  console.log(`   *    /api/admin/* - Admin routes\n`);
  
  // Initialize database after server starts
  await initializeDatabase();
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;