const path = require('path');
const fs = require('fs');

// Get document by path (admin only)
exports.getDocumentByPath = async (req, res) => {
  const docPath = req.params.path;
  
  // Security: Prevent path traversal attacks
  const normalizedPath = path.normalize(docPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(process.env.UPLOADS_DIR || 'uploads', normalizedPath);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }
    
    // Get file info
    const fileStats = fs.statSync(filePath);
    
    // Check if it's a file (not a directory)
    if (!fileStats.isFile()) {
      return res.status(400).json({
        message: 'Requested path is not a file'
      });
    }
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error retrieving document:', error);
    res.status(500).json({
      message: 'Server error retrieving document',
      error: error.message
    });
  }
};