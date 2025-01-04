// const express = require('express');
// const router = express.Router();
// const adminController = require('../controllers/adminController');
// const authMiddleware = require('../middleware/authMiddleware');

// // Middleware to check admin role
// const adminMiddleware = (req, res, next) => {
//   if (req.user.role !== 'ADMIN') {
//     return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
//   }
//   next();
// };

// // Apply authentication and admin middleware
// router.use(authMiddleware, adminMiddleware);

// // Routes for admin operations
// router.get('/applications', adminController.getAllApplications);
// router.get('/applications/:id', adminController.getApplicationDetails);
// router.patch('/applications/:id/status', adminController.updateApplicationStatus);
// router.get('/reports', adminController.generateReports);

// module.exports = router;



const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Wrapper function to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route for getting all applications
router.get('/applications', 
    authMiddleware, 
    adminMiddleware, 
    asyncHandler(adminController.getAllApplications)
);

// Route for getting application details
router.get('/applications/:id', 
    authMiddleware, 
    adminMiddleware, 
    asyncHandler(adminController.getApplicationDetails)
);

// Route for updating application status
router.patch('/applications/:id/status', 
    authMiddleware, 
    adminMiddleware, 
    asyncHandler(adminController.updateApplicationStatus)
);

// Route for generating reports
router.get('/reports', 
    authMiddleware, 
    adminMiddleware, 
    asyncHandler(adminController.generateReports)
);

module.exports = router;