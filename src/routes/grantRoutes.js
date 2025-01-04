const express = require('express');
const router = express.Router();
const grantApplicationController = require('../controllers/grantApplicationController');

// Application routes
router.post('/submit', grantApplicationController.submitGrantApplication);
router.get('/status/:applicationId', grantApplicationController.getGrantApplicationStatus);
router.get('/user-applications', grantApplicationController.getUserApplications);

// Grant listing routes
router.get('/all', grantApplicationController.getAllGrants);
router.get('/category/:category', grantApplicationController.getGrantsByCategory);
router.get('/search', grantApplicationController.searchGrants);

module.exports = router;