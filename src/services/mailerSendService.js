const axios = require('axios');

class MailerSendService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('MailerSend API key is required');
    }

    this.apiKey = apiKey;
    this.baseUrl = 'https://api.mailersend.com/v1';
  }

  async sendApplicationConfirmationEmail(applicationData) {
    try {
      const emailPayload = {
        from: {
          email: 'your-organization@example.com',
          name: 'Grant Application Team'
        },
        to: [
          {
            email: applicationData.personalInfo.email,
            name: `${applicationData.personalInfo.firstName} ${applicationData.personalInfo.lastName}`
          }
        ],
        subject: 'Grant Application Received - Confirmation',
        html: this._constructConfirmationEmailHtml(applicationData),
        text: this._constructConfirmationEmailText(applicationData)
      };

      const response = await axios.post(`${this.baseUrl}/email`, emailPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Email sending failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  _constructConfirmationEmailHtml(data) {
    return `
      <html>
        <body>
          <h1>Grant Application Received</h1>
          <p>Dear ${data.personalInfo.firstName} ${data.personalInfo.lastName},</p>
          <p>Your grant application has been successfully submitted. Here are the details:</p>
          <h2>Personal Information</h2>
          <ul>
            <li><strong>Name:</strong> ${data.personalInfo.firstName} ${data.personalInfo.lastName}</li>
            <li><strong>Email:</strong> ${data.personalInfo.email}</li>
            <li><strong>Phone:</strong> ${data.personalInfo.phoneNumber}</li>
          </ul>
          <h2>Funding Details</h2>
          <ul>
            <li><strong>Funding Type:</strong> ${data.fundingInfo.fundingType}</li>
            <li><strong>Amount:</strong> $${data.fundingInfo.fundingAmount}</li>
            <li><strong>Purpose:</strong> ${data.fundingInfo.fundingPurpose}</li>
          </ul>
          <p>Your application is currently in <strong>${data.status}</strong> status.</p>
          <p>We will review your application and contact you soon.</p>
          <p>Thank you,<br>Grant Application Team</p>
        </body>
      </html>
    `;
  }

  _constructConfirmationEmailText(data) {
    return `
Grant Application Received

Dear ${data.personalInfo.firstName} ${data.personalInfo.lastName},

Your grant application has been successfully submitted.

Personal Information:
- Name: ${data.personalInfo.firstName} ${data.personalInfo.lastName}
- Email: ${data.personalInfo.email}
- Phone: ${data.personalInfo.phoneNumber}

Funding Details:
- Funding Type: ${data.fundingInfo.fundingType}
- Amount: $${data.fundingInfo.fundingAmount}
- Purpose: ${data.fundingInfo.fundingPurpose}

Your application is currently in ${data.status} status.

We will review your application and contact you soon.

Thank you,
Grant Application Team
    `;
  }

  async sendInternalNotificationEmail(applicationData) {
    try {
      const emailPayload = {
        from: {
          email: 'notifications@example.com',
          name: 'Grant Application Notifications'
        },
        to: [
          {
            email: 'admin@example.com',
            name: 'Grant Application Admin'
          }
        ],
        subject: 'New Grant Application Submitted',
        html: this._constructInternalNotificationHtml(applicationData),
        text: this._constructInternalNotificationText(applicationData)
      };

      const response = await axios.post(`${this.baseUrl}/email`, emailPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Internal notification email failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  _constructInternalNotificationHtml(data) {
    return `
      <html>
        <body>
          <h1>New Grant Application Submitted</h1>
          <h2>Applicant Details</h2>
          <table>
            <tr><td><strong>Name:</strong></td><td>${data.personalInfo.firstName} ${data.personalInfo.lastName}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${data.personalInfo.email}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${data.personalInfo.phoneNumber}</td></tr>
            <tr><td><strong>Funding Amount:</strong></td><td>$${data.fundingInfo.fundingAmount}</td></tr>
          </table>
        </body>
      </html>
    `;
  }

  _constructInternalNotificationText(data) {
    return `
New Grant Application Submitted

Applicant Details:
- Name: ${data.personalInfo.firstName} ${data.personalInfo.lastName}
- Email: ${data.personalInfo.email}
- Phone: ${data.personalInfo.phoneNumber}
- Funding Amount: $${data.fundingInfo.fundingAmount}
    `;
  }
}

module.exports = MailerSendService;