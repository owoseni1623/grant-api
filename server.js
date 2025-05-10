const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Always create a clean .env file if in production and no .env exists
// This will help with environments like Render where env vars are set in the platform
const envPath = path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

// Log environment setup status
console.log('\n==== ENVIRONMENT SETUP ====');
console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`.env file ${envExists ? 'found' : 'not found'}`);

// Only try to load .env file if it exists
if (envExists) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('❌ ERROR: Failed to parse .env file:', result.error.message);
  } else {
    console.log('✅ Environment variables loaded from .env file');
  }
} else {
  console.log('ℹ️ No .env file found. Using environment variables from the system.');
  
  // For Render.com and similar platforms - create a temporary .env file with system env vars
  // This helps with systems that expect a .env file to exist
  if (process.env.NODE_ENV === 'production') {
    try {
      // Create basic .env with system variables
      const envContent = Object.entries(process.env)
        .filter(([key]) => ['JWT_SECRET', 'MONGODB_URI', 'ADMIN_SECRET', 'PORT'].includes(key))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created temporary .env file from system environment variables');
    } catch (err) {
      console.error('⚠️ Could not create temporary .env file:', err.message);
    }
  }
}

// Critical JWT_SECRET handling - IMPORTANT
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is missing!');
  
  // Set a temporary JWT_SECRET for development only
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Setting temporary JWT_SECRET for DEVELOPMENT mode only');
    process.env.JWT_SECRET = 'temporary_development_secret_do_not_use_in_production';
  } else {
    console.error('❌ Cannot continue without JWT_SECRET in production mode');
    // Don't exit in production as this might cause deployment failures
    // Instead, authentication will simply fail with proper error messages
  }
} else {
  console.log('✅ JWT_SECRET is properly configured');
}

// Log critical vars
console.log('\nCritical environment variables:');
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`- ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log('============================\n');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const grantRoutes = require('./src/routes/grantRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const helmet = require('helmet');
const morgan = require('morgan');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    jwtConfigured: !!process.env.JWT_SECRET
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
  const error = process.env.NODE_ENV === 'production' 
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
  
  // Graceful shutdown
  gracefulShutdown('Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Graceful shutdown
  gracefulShutdown('Uncaught Exception');
});

// Graceful shutdown function
const gracefulShutdown = (reason) => {
  console.log(`Initiating graceful shutdown. Reason: ${reason}`);
  
  server.close(() => {
    console.log('Server closed');
    
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('Database connection closed');
      process.exit(1);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  });
};

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;