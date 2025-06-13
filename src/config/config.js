const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Environment validation helper
const validateEnvironment = () => {
  console.log('==== ENVIRONMENT SETUP ====');
  console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
  
  const envPath = path.resolve(__dirname, '../../.env');
  const envExists = fs.existsSync(envPath);
  
  console.log(`.env file ${envExists ? 'found' : 'not found'}`);
  
  if (envExists) {
    try {
      dotenv.config({ path: envPath });
      console.log('✅ Environment variables loaded from .env file');
    } catch (error) {
      console.error('❌ Error loading .env file:', error.message);
    }
  } else {
    console.warn('⚠️ .env file not found, using environment variables or defaults');
  }
  
  // Validate critical environment variables
  const criticalVars = ['JWT_SECRET', 'MONGODB_URI', 'ADMIN_SECRET'];
  console.log('Critical environment variables:');
  
  criticalVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`- ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
  });
  
  console.log('============================\n');
};

// Load and validate environment on startup
validateEnvironment();

// Simplified configuration object
const config = {
  // Core app configuration
  app: {
    name: 'Grant Management System',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    apiBasePath: process.env.API_BASE_PATH || '/api'
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/grant-GOV',
    options: {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
    }
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    adminSecret: process.env.ADMIN_SECRET || 'default-admin-secret',
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    refreshExpire: process.env.REFRESH_TOKEN_EXPIRATION || '7d'
  },
  
  // Frontend configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    devUrl: process.env.DEV_FRONTEND_URL || 'http://localhost:5173'
  },
  
  // Email configuration
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'Grant Management System <noreply@grantmanagement.com>',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@grantmanagement.com'
  },
  
  // File upload configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png']
  }
};

// Helper functions
config.isProduction = () => config.app.env === 'production';
config.isDevelopment = () => config.app.env === 'development';
config.isTest = () => config.app.env === 'test';

// Export configuration
module.exports = config;