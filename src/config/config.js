const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to load .env file if exists
try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from .env file');
  }
} catch (error) {
  // Silently continue if .env fails to load
}

// Configuration with fallbacks
const config = {
  // Core app config
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Security - with hardcoded fallbacks for critical values
  jwt: {
    secret: process.env.JWT_SECRET || 'b2d1e4f7c3a6b9d0e5f8c1a4d7b0e3f6a9c2d5b8e1f4a7c0d3b6e9f2a5c8d1b4e7',
    expiresIn: '30d'
  },
  adminSecret: process.env.ADMIN_SECRET || 'motunrayo23!',
  
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://jonhson0816:2do1gceaAYQzlOuz@clustermytech.sms2h.mongodb.net/grant-GOV'
  },
  
  // Frontend URL for CORS
  frontendUrl: process.env.FRONTEND_URL || 'https://grant-pi.vercel.app',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Ensure we have critical values
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not found in environment, using fallback value');
}

if (!process.env.MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI not found in environment, using fallback value');
}

module.exports = config;