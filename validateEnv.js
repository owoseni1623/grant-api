/**
 * This script validates that all required environment variables are set
 * Run it before starting your server to catch configuration issues early
 */
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log('==== Environment Variable Validation ====');
console.log(`Checking .env file at: ${envPath}`);

if (!envExists) {
  console.log('❌ .env file not found! Please create it based on .env.example');
} else {
  console.log('✅ .env file found');
 
  // Load environment variables
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('❌ Error parsing .env file:', result.error.message);
  } else {
    console.log('✅ .env file parsed successfully');
  }
}

// Define required environment variables
const requiredVariables = [
  { name: 'PORT', defaultValue: '3000' },
  { name: 'MONGODB_URI', required: true },
  { name: 'JWT_SECRET', required: true },
  { name: 'NODE_ENV', defaultValue: 'development' },
  { name: 'FRONTEND_URL', required: true },
  { name: 'ADMIN_SECRET', required: true }
];

// Check each required variable
console.log('\nChecking required environment variables:');
let hasErrors = false;

for (const variable of requiredVariables) {
  const value = process.env[variable.name];
 
  if (!value) {
    if (variable.required) {
      console.log(`❌ ${variable.name}: Missing (REQUIRED)`);
      hasErrors = true;
    } else if (variable.defaultValue) {
      console.log(`⚠️ ${variable.name}: Missing (will use default: ${variable.defaultValue})`);
    } else {
      console.log(`⚠️ ${variable.name}: Missing (optional)`);
    }
  } else {
    // Don't print actual values for security, just show that they exist
    console.log(`✅ ${variable.name}: Set`);
  }
}

// Print JWT_SECRET validation result
if (process.env.JWT_SECRET) {
  const secretLength = process.env.JWT_SECRET.length;
  if (secretLength < 16) {
    console.log(`⚠️ JWT_SECRET is only ${secretLength} characters long (recommended: 32+)`);
  }
} else {
  console.log('❌ JWT_SECRET is not set! Authentication will fail.');
}

// Final output
console.log('\n==== Validation Complete ====');
if (hasErrors) {
  console.log('❌ There are missing required environment variables!');
  console.log('   Please fix them before starting the server.');
} else {
  console.log('✅ All required environment variables are set!');
}

// Export validation result for use in other scripts
module.exports = !hasErrors;