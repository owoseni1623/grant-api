/**
 * Environment Configuration Handler
 * Handles environment variables from both .env files and system environment
 */
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env file if it exists, otherwise rely on system env vars
const envPath = path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

// Log environment setup status (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  console.log('\n==== ENVIRONMENT SETUP ====');
  console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`.env file ${envExists ? 'found' : 'not found'}`);
}

// Only try to load .env file if it exists
if (envExists) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error && process.env.NODE_ENV !== 'production') {
    console.error('❌ ERROR: Failed to parse .env file:', result.error.message);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Environment variables loaded from .env file');
  }
} else if (process.env.NODE_ENV !== 'production') {
  console.log('ℹ️ No .env file found. Using environment variables from the system.');
}

// Ensure JWT_SECRET is defined
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // In production, log error but don't set a default value
    console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in production!');
  } else {
    // In development, set a temporary value
    console.warn('⚠️ Setting temporary JWT_SECRET for DEVELOPMENT mode only');
    process.env.JWT_SECRET = 'temporary_development_secret_do_not_use_in_production';
  }
} else if (process.env.NODE_ENV !== 'production') {
  console.log('✅ JWT_SECRET is properly configured');
}

// Log critical vars in non-production mode
if (process.env.NODE_ENV !== 'production') {
  console.log('\nCritical environment variables:');
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ADMIN_SECRET: ${process.env.ADMIN_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log('============================\n');
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL
};