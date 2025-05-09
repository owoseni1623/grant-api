const Application = require('../models/Application');
const User = require('../models/User');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts of applications by status
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({ status: 'PENDING' });
    const approvedApplications = await Application.countDocuments({ status: 'APPROVED' });
    const rejectedApplications = await Application.countDocuments({ status: 'REJECTED' });
    
    // Get recent applications
    const recentApplications = await Application.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email');
    
    // Get total users count
    const totalUsers = await User.countDocuments({ role: 'USER' });
    
    // Get funding stats
    const fundingStats = await Application.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: {
          _id: null,
          totalApproved: { $sum: '$fundingInfo.fundingAmount' },
          avgAmount: { $avg: '$fundingInfo.fundingAmount' },
          maxAmount: { $max: '$fundingInfo.fundingAmount' }
        }
      }
    ]);
    
    // Get distribution by funding type
    const fundingTypeDistribution = await Application.aggregate([
      { $group: {
          _id: '$fundingInfo.fundingType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      counts: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        users: totalUsers
      },
      recentApplications,
      fundingStats: fundingStats[0] || {
        totalApproved: 0,
        avgAmount: 0,
        maxAmount: 0
      },
      fundingTypeDistribution
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({
      message: 'Error retrieving dashboard statistics',
      error: error.message
    });
  }
};

// Get all applications with optional filtering
exports.getAllApplications = async (req, res) => {
  try {
    const { status, fundingType, search, sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (status) query.status = status;
    if (fundingType) query['fundingInfo.fundingType'] = fundingType;
    
    // Add search if provided
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'addressInfo.city': { $regex: search, $options: 'i' } },
        { 'fundingInfo.fundingPurpose': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortDir === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const applications = await Application.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email');
    
    // Get total count for pagination
    const total = await Application.countDocuments(query);
    
    res.json({
      applications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({
      message: 'Error retrieving applications',
      error: error.message
    });
  }
};

// Get a single application by ID
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('userId', 'firstName lastName email');
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Get Application Error:', error);
    res.status(500).json({
      message: 'Error retrieving application',
      error: error.message
    });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  
  try {
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Update status
    application.status = status;
    
    // Add status change to history
    if (!application.statusHistory) {
      application.statusHistory = [];
    }
    
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user.userId
    });
    
    await application.save();
    
    res.json(application);
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      message: 'Error updating application status',
      error: error.message
    });
  }
};