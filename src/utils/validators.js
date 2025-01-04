// utils/validators.js
const validator = require('validator');

const validateRegistrationData = (data) => {
  const errors = {};

  // First Name validation
  if (!data.firstName || validator.isEmpty(data.firstName.trim())) {
    errors.firstName = 'First name is required';
  }

  // Last Name validation
  if (!data.lastName || validator.isEmpty(data.lastName.trim())) {
    errors.lastName = 'Last name is required';
  }

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validator.isEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Primary Phone validation
  if (!data.primaryPhone) {
    errors.primaryPhone = 'Primary phone is required';
  } else if (!validator.isMobilePhone(data.primaryPhone, 'en-US')) {
    errors.primaryPhone = 'Please enter a valid 10-digit phone number';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(data.password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(data.password)) {
      errors.password = 'Password must contain at least one number';
    }
  }

  // Confirm Password validation
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = {
  validateRegistrationData
};