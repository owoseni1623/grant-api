const Application = require('../models/Application'); // You'll need to create this model

// Get all applications (admin only)
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .sort({ createdAt: -1 }); // Newest first
      
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      message: 'Server error fetching applications',
      error: error.message
    });
  }
};

// Update application status (admin only)
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Validate status
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({
      message: 'Invalid status. Must be PENDING, APPROVED, or REJECTED'
    });
  }
  
  try {
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }
    
    // Update status
    application.status = status;
    
    // Add status history
    application.statusHistory = application.statusHistory || [];
    application.statusHistory.push({
      status,
      changedBy: req.user.userId,
      changedAt: new Date()
    });
    
    await application.save();
    
    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      message: 'Server error updating application status',
      error: error.message
    });
  }
};