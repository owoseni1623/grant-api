// const nodemailer = require('nodemailer');
// const path = require('path');
// require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// // Create a transporter using SMTP
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS
//     },
//     // Add these additional options for better reliability
//     tls: {
//       rejectUnauthorized: false
//     }
//   });
// };

// // Function to send application received email to admin
// const sendAdminNotification = async (application) => {
//   const transporter = createTransporter();

//   // Ensure all required fields exist
//   const firstName = application.personalInfo?.firstName || 'Unknown';
//   const lastName = application.personalInfo?.lastName || 'Applicant';
//   const email = application.personalInfo?.email || 'N/A';
//   const fundingAmount = application.fundingInfo?.fundingAmount || 0;
//   const fundingPurpose = application.fundingInfo?.fundingPurpose || 'Not Specified';
//   const status = application.status || 'PENDING';

//   const mailOptions = {
//     from: `Grant Application System <${process.env.EMAIL_USER}>`,
//     to: process.env.ADMIN_EMAIL,
//     subject: 'New Grant Application Received',
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #2c3e50;">New Grant Application Submitted</h2>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Applicant:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${firstName} ${lastName}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Email:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${email}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Funding Amount:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">$${fundingAmount.toLocaleString()}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Funding Purpose:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${fundingPurpose}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px;"><strong>Application Status:</strong></td>
//             <td style="padding: 10px;">${status}</td>
//           </tr>
//         </table>
//         <p style="margin-top: 20px; color: #7f8c8d;">Please review the full application details in the system.</p>
//       </div>
//     `
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Admin notification email sent successfully', info.messageId);
//     return info;
//   } catch (error) {
//     console.error('Failed to send admin notification email:', error);
//     throw error; // Re-throw to allow caller to handle
//   }
// };

// // Function to send confirmation email to applicant
// const sendApplicantConfirmation = async (application) => {
//   const transporter = createTransporter();

//   // Ensure all required fields exist with safe fallbacks
//   const firstName = application.personalInfo?.firstName || 'Applicant';
//   const fundingType = application.fundingInfo?.fundingType || 'Not Specified';
//   const fundingAmount = application.fundingInfo?.fundingAmount || 0;
//   const fundingPurpose = application.fundingInfo?.fundingPurpose || 'Not Specified';
//   const status = application.status || 'PENDING';

//   const mailOptions = {
//     from: `Grant Application System <${process.env.EMAIL_USER}>`,
//     to: application.personalInfo.email,
//     subject: 'Grant Application Received',
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #2c3e50;">Your Grant Application Has Been Received</h2>
//         <p>Dear ${firstName},</p>
//         <p>Thank you for submitting your grant application. We have received your application and will review it shortly.</p>
        
//         <h3 style="color: #2980b9;">Application Details:</h3>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Funding Type:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${fundingType}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;"><strong>Funding Amount:</strong></td>
//             <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">$${fundingAmount.toLocaleString()}</td>
//           </tr>
//           <tr>
//             <td style="padding: 10px;"><strong>Funding Purpose:</strong></td>
//             <td style="padding: 10px;">${fundingPurpose}</td>
//           </tr>
//         </table>
        
//         <p style="margin-top: 20px;">Your application is currently in <strong>${status}</strong> status.</p>
//         <p>We will contact you with further updates.</p>
        
//         <p style="margin-top: 30px; color: #7f8c8d;">Best regards,<br>Grant Application Team</p>
//       </div>
//     `
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Applicant confirmation email sent successfully', info.messageId);
//     return info;
//   } catch (error) {
//     console.error('Failed to send applicant confirmation email:', error);
//     throw error; // Re-throw to allow caller to handle
//   }
// };

// // Error handling middleware
// const handleEmailError = (error, req, res, next) => {
//   console.error('Email sending error:', error);
  
//   if (error.code === 'EAUTH') {
//     return res.status(500).json({
//       message: 'Email configuration error. Please check your email credentials.',
//       error: error.message
//     });
//   }
  
//   next(error);
// };

// module.exports = {
//   sendAdminNotification,
//   sendApplicantConfirmation,
//   handleEmailError
// };



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