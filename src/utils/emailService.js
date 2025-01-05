// require('dotenv').config(); 
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const nodemailer = require('nodemailer');

// Create a transporter using SMTP with Gmail configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Use Gmail service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Additional security and configuration
    secure: true,
    requireTLS: true
  });
};

// Utility function to format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Send notification to admin
exports.sendAdminNotification = async (application) => {
  try {
    const { 
      personalInfo, 
      fundingInfo, 
      documents,
      status,
      createdAt
    } = application;

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New Grant Application Received - ${personalInfo.firstName} ${personalInfo.lastName}`,
      html: `
        <h1>New Grant Application Received</h1>
        
        <h2>Personal Information</h2>
        <p><strong>Name:</strong> ${personalInfo.firstName} ${personalInfo.lastName}</p>
        <p><strong>Email:</strong> ${personalInfo.email}</p>
        <p><strong>Phone:</strong> ${personalInfo.phoneNumber}</p>
        
        <h2>Funding Information</h2>
        <p><strong>Funding Type:</strong> ${fundingInfo.fundingType}</p>
        <p><strong>Funding Amount:</strong> $${fundingInfo.fundingAmount.toLocaleString()}</p>
        <p><strong>Funding Purpose:</strong> ${fundingInfo.fundingPurpose}</p>
        
        <h2>Additional Details</h2>
        <p><strong>Application Status:</strong> ${status}</p>
        <p><strong>Application Date:</strong> ${formatDate(createdAt)}</p>
        
        <p>Please log in to the system to review the full application details.</p>
      `,
      attachments: documents && documents.idCardFront && documents.idCardBack ? [
        {
          path: documents.idCardFront,
          filename: `${personalInfo.lastName}_id_front.jpg`
        },
        {
          path: documents.idCardBack,
          filename: `${personalInfo.lastName}_id_back.jpg`
        }
      ] : []
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent successfully');
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
    throw error; // Re-throw in all environments
  }
};

// Send confirmation to applicant
exports.sendApplicantConfirmation = async (application) => {
  try {
    const { personalInfo, fundingInfo } = application;

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: personalInfo.email,
      subject: 'Grant Application Received - Confirmation',
      html: `
        <h1>Grant Application Received</h1>
        
        <p>Dear ${personalInfo.firstName} ${personalInfo.lastName},</p>
        
        <p>We have received your grant application with the following details:</p>
        
        <h2>Funding Details</h2>
        <p><strong>Funding Type:</strong> ${fundingInfo.fundingType}</p>
        <p><strong>Funding Amount:</strong> $${fundingInfo.fundingAmount.toLocaleString()}</p>
        <p><strong>Funding Purpose:</strong> ${fundingInfo.fundingPurpose}</p>
        
        <p>Your application is currently under review. We will contact you with further updates.</p>
        
        <p>Thank you for your application!</p>
        
        <p>Best regards,<br>Grants Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Applicant confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send applicant confirmation email:', error);
    throw error; // Re-throw in all environments
  }
};