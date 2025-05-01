// src/controllers/documentController.js
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const GrantApplication = require('../models/GrantApplication');

/**
 * Download a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadDocument = async (req, res) => {
  try {
    // The path parameter will be encoded in the URL
    const documentPath = decodeURIComponent(req.params.path);
    
    // Security check - make sure the path doesn't contain '..'
    if (documentPath.includes('..')) {
      return res.status(403).json({ message: 'Invalid document path' });
    }
    
    // Determine storage location - adjust this to your actual document storage path
    const storagePath = process.env.DOCUMENT_STORAGE_PATH || path.join(__dirname, '../../uploads');
    const fullPath = path.join(storagePath, documentPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Send the file
    res.sendFile(fullPath);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      message: 'Error retrieving document', 
      error: error.message 
    });
  }
};

/**
 * Alternative implementation using GridFS if documents are stored in MongoDB
 */
const downloadMongoDocument = async (req, res) => {
  try {
    const documentPath = decodeURIComponent(req.params.path);
    
    // Find application that contains this document path
    const application = await GrantApplication.findOne({
      $or: [
        { 'documents.idCardFront': documentPath },
        { 'documents.idCardBack': documentPath },
        { 'documents.additionalDocs': documentPath }
      ]
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Document not found in any application' });
    }
    
    // If using GridFS, use this approach:
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);
    const downloadStream = bucket.openDownloadStreamByName(documentPath);
    
    downloadStream.on('error', error => {
      console.error('Error downloading from GridFS:', error);
      res.status(404).json({ message: 'Document not found in storage' });
    });
    
    // Set appropriate headers
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${path.basename(documentPath)}"`);
    
    // Pipe the file to the response
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      message: 'Error retrieving document', 
      error: error.message 
    });
  }
};

// Properly export all functions
module.exports = {
  downloadDocument,
  downloadMongoDocument
};