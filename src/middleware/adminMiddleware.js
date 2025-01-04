const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user exists and is authenticated (assumes authMiddleware runs first)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Fetch the full user from the database to check admin status
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if the user has admin privileges
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // User is an admin, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ 
      message: 'Internal server error during admin authentication', 
      error: error.message 
    });
  }
};

module.exports = adminMiddleware;