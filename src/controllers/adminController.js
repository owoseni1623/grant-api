const GrantApplication = require('../models/GrantApplication');
const path = require('path');
const User = require('../models/User'); // Assuming you have a User model

// Get all applications with filtering and pagination
exports.getAllApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const searchTerm = req.query.search;

    // Build dynamic query
    let query = {};
    if (status) {
      query.status = status;
    }
    if (searchTerm) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
        { 'personalInfo.email': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Fetch paginated applications
    const applications = await GrantApplication.find(query)
      .select('-documents')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Count total matching applications
    const total = await GrantApplication.countDocuments(query);

    res.status(200).json({
      applications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalApplications: total
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving applications', 
      error: error.message 
    });
  }
};

exports.getApplicationDetails = async (req, res) => {
  try {
    const application = await GrantApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving application details', 
      error: error.message 
    });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const application = await GrantApplication.findByIdAndUpdate(
      id, 
      { 
        status, 
        adminNotes 
      }, 
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating application status', 
      error: error.message 
    });
  }
};

exports.generateReports = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build query for report
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) {
      query.status = status;
    }

    // Aggregate report data
    const report = await GrantApplication.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          totalApplications: { $sum: 1 },
          totalFundingRequested: { $sum: '$fundingInfo.fundingAmount' },
          averageFundingAmount: { $avg: '$fundingInfo.fundingAmount' }
        }
      }
    ]);

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};