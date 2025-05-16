const Application = require('../models/Application');
const { GrantApplication, Grant } = require('../models/GrantApplication');
const User = require('../models/User');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts of applications from both models
    const totalApplications = await Promise.all([
      Application.countDocuments(),
      GrantApplication.countDocuments()
    ]).then(counts => counts[0] + counts[1]);
    
    const pendingApplications = await Promise.all([
      Application.countDocuments({ status: 'PENDING' }),
      GrantApplication.countDocuments({ status: 'PENDING' })
    ]).then(counts => counts[0] + counts[1]);
    
    const approvedApplications = await Promise.all([
      Application.countDocuments({ status: 'APPROVED' }),
      GrantApplication.countDocuments({ status: 'APPROVED' })
    ]).then(counts => counts[0] + counts[1]);
    
    const rejectedApplications = await Promise.all([
      Application.countDocuments({ status: 'REJECTED' }),
      GrantApplication.countDocuments({ status: 'REJECTED' })
    ]).then(counts => counts[0] + counts[1]);
    
    // Get recent applications (combine from both models)
    const recentApplicationsStandard = await Application.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'firstName lastName email')
      .lean();
      
    const recentApplicationsGrant = await GrantApplication.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    // Combine and sort by date
    const recentApplications = [...recentApplicationsStandard, ...recentApplicationsGrant]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    // Get total users count
    const totalUsers = await User.countDocuments({ role: 'USER' });
    
    // Get funding stats for both models
    const fundingStatsStandard = await Application.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: {
          _id: null,
          totalApproved: { $sum: '$fundingInfo.fundingAmount' },
          avgAmount: { $avg: '$fundingInfo.fundingAmount' },
          maxAmount: { $max: '$fundingInfo.fundingAmount' }
        }
      }
    ]);
    
    const fundingStatsGrant = await GrantApplication.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: {
          _id: null,
          totalApproved: { $sum: '$fundingInfo.fundingAmount' },
          avgAmount: { $avg: '$fundingInfo.fundingAmount' },
          maxAmount: { $max: '$fundingInfo.fundingAmount' }
        }
      }
    ]);
    
    // Combine funding stats
    const combinedFundingStats = {
      totalApproved: 
        (fundingStatsStandard[0]?.totalApproved || 0) + 
        (fundingStatsGrant[0]?.totalApproved || 0),
      avgAmount: 
        ((fundingStatsStandard[0]?.avgAmount || 0) + 
        (fundingStatsGrant[0]?.avgAmount || 0)) / 
        (fundingStatsStandard[0] && fundingStatsGrant[0] ? 2 : 1),
      maxAmount: 
        Math.max(
          fundingStatsStandard[0]?.maxAmount || 0, 
          fundingStatsGrant[0]?.maxAmount || 0
        )
    };
    
    // Get distribution by funding type for both models
    const fundingTypeDistributionStandard = await Application.aggregate([
      { $group: {
          _id: '$fundingInfo.fundingType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const fundingTypeDistributionGrant = await GrantApplication.aggregate([
      { $group: {
          _id: '$fundingInfo.fundingType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Combine funding type distributions
    const fundingTypeDistribution = [];
    const typeMap = new Map();
    
    [...fundingTypeDistributionStandard, ...fundingTypeDistributionGrant].forEach(item => {
      if (typeMap.has(item._id)) {
        typeMap.set(item._id, typeMap.get(item._id) + item.count);
      } else {
        typeMap.set(item._id, item.count);
      }
    });
    
    typeMap.forEach((count, type) => {
      fundingTypeDistribution.push({ _id: type, count });
    });
    
    fundingTypeDistribution.sort((a, b) => b.count - a.count);
    
    res.json({
      counts: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        users: totalUsers
      },
      recentApplications,
      fundingStats: combinedFundingStats,
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
    
    // Fetch applications from both models
    const [standardApps, grantApps, standardTotal, grantTotal] = await Promise.all([
      // Standard applications
      Application.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean(),
        
      // Grant applications  
      GrantApplication.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
        
      // Count totals for pagination  
      Application.countDocuments(query),
      GrantApplication.countDocuments(query)
    ]);
    
    // Normalize the data structure from both models to ensure consistency
    const normalizedGrants = grantApps.map(app => ({
      ...app,
      _id: app._id || app.id,
      userId: app.userId || null,
      // Ensure other required fields exist
      status: app.status || 'PENDING',
      statusHistory: app.statusHistory || [],
      submittedBy: app.submittedBy || null,
      source: 'GRANT' // Mark the source to distinguish between models
    }));
    
    const normalizedStandard = standardApps.map(app => ({
      ...app,
      source: 'STANDARD' // Mark the source to distinguish between models
    }));
    
    // Combine applications and sort them
    const applications = [...normalizedStandard, ...normalizedGrants]
      .sort((a, b) => {
        if (sortDir === 'asc') {
          return new Date(a[sortBy] || a.createdAt) - new Date(b[sortBy] || b.createdAt);
        }
        return new Date(b[sortBy] || b.createdAt) - new Date(a[sortBy] || a.createdAt);
      })
      .slice(0, limit);
    
    const total = standardTotal + grantTotal;
    
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
    // Try to find in standard applications first
    let application = await Application.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .lean();
    
    // If not found, try to find in grant applications
    if (!application) {
      application = await GrantApplication.findById(req.params.id).lean();
      
      if (application) {
        // Mark the source for frontend handling
        application.source = 'GRANT';
      }
    } else {
      // Mark as standard application
      application.source = 'STANDARD';
    }
    
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
    // Try to find and update in standard applications first
    let application = await Application.findById(id);
    let isGrantApplication = false;
    
    // If not found, try to find in grant applications
    if (!application) {
      application = await GrantApplication.findById(id);
      isGrantApplication = true;
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
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
    
    // Mark the source for consistency
    const result = application.toObject();
    result.source = isGrantApplication ? 'GRANT' : 'STANDARD';
    
    res.json(result);
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      message: 'Error updating application status',
      error: error.message
    });
  }
};