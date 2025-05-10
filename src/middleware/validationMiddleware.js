const { body, validationResult } = require('express-validator');

// Validation rules for grant application
const validateGrantApplication = [
  // Personal Information Validations
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('ssn')
    .trim()
    .matches(/^\d{9}$/)
    .withMessage('SSN must be 9 digits'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  
  // Age and Date Validations
  body('age')
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120'),
  body('dateOfBirth').isDate().withMessage('Invalid date of birth'),

  // Funding Validations
  body('fundingAmount')
    .isFloat({ min: 75000 })
    .withMessage('Minimum funding amount is $75,000'),
  
  // Terms and Communication
  body('termsAccepted')
    .isBoolean()
    .custom(value => value === true)
    .withMessage('Terms must be accepted')
];

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Return first error if validation fails
  return res.status(400).json({ 
    errors: errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }))
  });
};

module.exports = {
  validateGrantApplication,
  validate
};