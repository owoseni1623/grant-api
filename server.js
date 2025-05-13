const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const grantRoutes = require('./src/routes/grantRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config(); // Ensure environment variables are loaded

// Create Express app
const app = express();

// Comprehensive CORS configuration
const corsOptions = {
  origin: [
    'https://grant-pi.vercel.app',
    'https://grant-pi.vercel.app/', // with trailing slash
    'http://localhost:5173',        // local development
    'http://localhost:3000',        // local development
    'http://127.0.0.1:3000'         // local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Logging middleware
app.use(morgan('dev'));

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

// Serve static files for uploaded documents
app.use('/uploads', express.static(uploadDir));

// Advanced Environment Configuration
const validateEnvironmentVariables = () => {
  const missingCriticalVars = [];
  const criticalVars = ['JWT_SECRET', 'MONGODB_URI'];
  
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingCriticalVars.push(varName);
    }
  });

  // If missing critical vars in production, throw error
  if (process.env.NODE_ENV === 'production' && missingCriticalVars.length > 0) {
    throw new Error(`Missing critical environment variables in production: ${missingCriticalVars.join(', ')}`);
  }

  // Generate secrets if not provided (mainly for development)
  const generateSecureSecret = () => crypto.randomBytes(64).toString('hex');

  return {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || generateSecureSecret(),
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || generateSecureSecret(),
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://grant-pi.vercel.app'
  };
};

// Validate and extract environment configuration
const ENV = validateEnvironmentVariables();

// Helpful console logs for debugging
console.log(`🚀 Server starting in ${ENV.NODE_ENV} mode`);
console.log(`📦 MongoDB URI: ${ENV.MONGODB_URI ? 'Configured' : 'Not Configured'}`);
console.log(`🔐 JWT Secret: ${ENV.JWT_SECRET ? 'Generated' : 'Missing'}`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    jwtConfigured: !!ENV.JWT_SECRET
  });
});

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grants', grantRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Simple test route
app.get('/test', (req, res) => {
  res.status(200).json({ message: "API is working correctly!" });
});

// Preflight CORS handling
app.options('*', cors(corsOptions));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Clean the error stack in production
  const error = ENV.NODE_ENV === 'production' 
    ? { message: err.message }
    : { message: err.message, stack: err.stack };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  if (err.code === 11000) { // MongoDB duplicate key error
    return res.status(409).json({
      message: 'Duplicate entry found'
    });
  }

  // Default error response
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred',
    ...error
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

// Graceful shutdown function
const gracefulShutdown = async (reason) => {
  console.log(`Initiating graceful shutdown. Reason: ${reason}`);
  
  try {
    // Close server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else {
            console.log('Server closed');
            resolve();
          }
        });
      });
    }
    
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('Database connection closed');
    }
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
  console.log(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;