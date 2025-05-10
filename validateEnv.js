/**
 * Environment Validator Script
 * Run this script to check environment variables before starting your application
 * Usage: node validate-env.js
 */
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log('\n======== ENVIRONMENT VARIABLE VALIDATOR ========');
console.log(`Checking for .env file at: ${envPath}`);

// Load environment variables
if (envExists) {
  console.log('✅ .env file found');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('❌ Error parsing .env file:', result.error.message);
  } else {
    console.log('✅ .env file parsed successfully');
  }
} else {
  console.log('❌ .env file not found - checking system environment variables');
}

// Critical variables and their importance
const criticalVariables = [
  { name: 'JWT_SECRET', required: true, sensitive: true, 
    description: 'Secret key for JWT token encryption', 
    validation: val => val && val.length >= 32 },
    
  { name: 'MONGODB_URI', required: true, sensitive: true,
    description: 'MongoDB connection string', 
    validation: val => val && val.startsWith('mongodb') },
    
  { name: 'ADMIN_SECRET', required: true, sensitive: true,
    description: 'Secret for admin user creation', 
    validation: val => val && val.length >= 8 },
    
  { name: 'PORT', required: false, sensitive: false,
    description: 'Port for the server to listen on',
    defaultValue: '3000',
    validation: val => !val || !isNaN(parseInt(val)) },
    
  { name: 'NODE_ENV', required: false, sensitive: false,
    description: 'Node environment (development/production)',
    defaultValue: 'development',
    validation: val => !val || ['development', 'production', 'test'].includes(val) },
    
  { name: 'FRONTEND_URL', required: true, sensitive: false,
    description: 'URL of the frontend application for CORS',
    validation: val => val && (val.startsWith('http://') || val.startsWith('https://')) }
];

// Check each variable
console.log('\n------- Critical Environment Variables -------');
let hasErrors = false;
let jwtSecretStatus = 'missing';

criticalVariables.forEach(variable => {
  const value = process.env[variable.name];
  const present = !!value;
  const valid = present && variable.validation ? variable.validation(value) : present;
  
  // Store JWT_SECRET status separately
  if (variable.name === 'JWT_SECRET') {
    if (!present) jwtSecretStatus = 'missing';
    else if (!valid) jwtSecretStatus = 'invalid';
    else jwtSecretStatus = 'valid';
  }
  
  // Output status
  if (!present) {
    if (variable.required) {
      console.log(`❌ ${variable.name}: MISSING (REQUIRED) - ${variable.description}`);
      hasErrors = true;
    } else if (variable.defaultValue) {
      console.log(`⚠️ ${variable.name}: Missing - Will use default: "${variable.defaultValue}"`);
    } else {
      console.log(`⚠️ ${variable.name}: Missing - ${variable.description}`);
    }
  } else if (!valid) {
    console.log(`⚠️ ${variable.name}: SET BUT INVALID - ${variable.description}`);
    if (variable.required) hasErrors = true;
  } else {
    if (variable.sensitive) {
      console.log(`✅ ${variable.name}: Set correctly (value hidden)`);
    } else {
      console.log(`✅ ${variable.name}: Set to "${value}"`);
    }
  }
});

// Special handling for JWT_SECRET
if (jwtSecretStatus === 'missing') {
  console.log('\n⛔ JWT_SECRET IS MISSING! This will cause all authentication to fail.');
  console.log('  You must set this value in your environment or .env file.');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('  For development, a temporary value will be used, but this is NOT secure.');
  }
} else if (jwtSecretStatus === 'invalid') {
  console.log('\n⚠️ JWT_SECRET appears to be too short or weak.');
  console.log('  For security, use a longer, more complex value (32+ characters recommended).');
} else {
  console.log('\n✅ JWT_SECRET is properly configured.');
}

// Output final status
console.log('\n============ Validation Complete ============');
if (hasErrors) {
  console.log('❌ VALIDATION FAILED: Please fix the issues above before running your application.');
  console.log('\nSuggested .env file template:');
  console.log('----------------------------------------');
  
  criticalVariables.forEach(variable => {
    if (variable.name === 'JWT_SECRET' && !process.env.JWT_SECRET) {
      console.log(`JWT_SECRET=replace_this_with_a_long_random_string_at_least_32_chars`);
    } else if (variable.required && !process.env[variable.name]) {
      console.log(`${variable.name}=YOUR_${variable.name}_HERE`);
    } else if (process.env[variable.name]) {
      if (variable.sensitive) {
        console.log(`${variable.name}=******* (already set)`);
      } else {
        console.log(`${variable.name}=${process.env[variable.name]}`);
      }
    } else if (variable.defaultValue) {
      console.log(`# ${variable.name}=${variable.defaultValue} (optional - will use default if not set)`);
    } else {
      console.log(`# ${variable.name}=YOUR_${variable.name}_HERE (optional)`);
    }
  });
  console.log('----------------------------------------');
  
  process.exit(1);
} else {
  console.log('✅ SUCCESS: All required environment variables are properly configured!');
  process.exit(0);
}