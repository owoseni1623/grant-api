const express = require('express');
const { check } = require('express-validator');
const { 
  // Grant Application endpoints
  submitGrantApplication,
  getGrantApplicationStatus,
  getGrantApplicationDetails,
  getUserApplications,
  updateApplicationStatus,
  
  // Grant Management endpoints
  getAllGrants,
  getGrantsByCategory,
  searchGrants,
  getGrantById,
  createGrant,
  updateGrant,
  deleteGrant
} = require('../controllers/grantApplicationController');

// Auth middleware import
const { isAuth, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Grant Application Routes
 */

// Submit a new grant application
router.post(
  '/applications',
  [
    // Input validation using express-validator
    check('firstName').trim().notEmpty().withMessage('First name is required'),
    check('lastName').trim().notEmpty().withMessage('Last name is required'),
    check('email').isEmail().withMessage('Valid email is required'),
    check('phoneNumber').matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/).withMessage('Valid phone number is required'),
    check('ssn').matches(/^\d{3}-?\d{2}-?\d{4}$/).withMessage('Valid SSN is required'),
    check('dateOfBirth').isDate().withMessage('Valid date of birth is required'),
    check('streetAddress').trim().notEmpty().withMessage('Street address is required'),
    check('city').trim().notEmpty().withMessage('City is required'),
    check('state').trim().notEmpty().withMessage('State is required'),
    check('zip').matches(/^\d{5}(-\d{4})?$/).withMessage('Valid ZIP code is required'),
    check('fundingType').trim().notEmpty().withMessage('Funding type is required'),
    check('fundingAmount').isFloat({ min: 75000, max: 750000 }).withMessage('Funding amount must be between $75,000 and $750,000'),
    check('fundingPurpose').trim().notEmpty().withMessage('Funding purpose is required'),
    check('termsAccepted').isBoolean().toBoolean().equals('true').withMessage('Terms must be accepted')
  ],
  submitGrantApplication
);

// Get the status of an application
router.get('/applications/:applicationId/status', getGrantApplicationStatus);

// Get detailed information about an application (authenticated)
router.get('/applications/:applicationId', isAuth, getGrantApplicationDetails);

// Get all applications for a user by email
router.get('/applications', isAuth, getUserApplications);

// Update application status (admin only)
router.patch('/applications/:applicationId/status', isAdmin, updateApplicationStatus);

/**
 * Grant Listing Routes
 */

// Get all grants with pagination
router.get('/grants', getAllGrants);

// Get grants by category
router.get('/grants/category/:category', getGrantsByCategory);

// Search grants
router.get('/grants/search', searchGrants);

// Get specific grant by ID
router.get('/grants/:grantId', getGrantById);

// Create new grant (admin only)
router.post(
  '/grants',
  isAdmin,
  [
    check('title').trim().notEmpty().withMessage('Title is required'),
    check('description').trim().notEmpty().withMessage('Description is required'),
    check('category').trim().notEmpty().withMessage('Category is required'),
    check('amount').isFloat({ min: 1000 }).withMessage('Amount must be at least $1,000')
  ],
  createGrant
);

// Update existing grant (admin only)
router.put('/grants/:grantId', isAdmin, updateGrant);

// Delete grant (admin only)
router.delete('/grants/:grantId', isAdmin, deleteGrant);

module.exports = router;