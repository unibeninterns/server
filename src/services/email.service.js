import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { BadRequestError } from '../utils/customErrors.js';
import validateEnv from '../utils/validateEnv.js';

validateEnv();

// Email Templates with Fuchsia Theme
const commonStyles = `
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
}
.header {
    color: #701a75;
    border-bottom: 2px solid #701a75;
    padding-bottom: 10px;
    margin-bottom: 20px;
}
.content {
    padding: 15px;
    background-color: #ffffff;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.article-title {
    font-size: 18px;
    color: #701a75;
    padding: 10px;
    background-color: #fce4ec;
    border-left: 3px solid #701a75;
    margin: 15px 0;
}
.button {
    display: inline-block;
    padding: 10px 20px;
    background-color: #701a75;
    color: white !important;
    text-decoration: none;
    border-radius: 4px;
    margin: 15px 0;
    font-weight: bold;
}
.footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #e0e0e0;
    font-size: 14px;
    color: #666666;
    text-align: center;
}
.credentials {
    background-color: #fce4ec;
    padding: 15px;
    border-left: 3px solid #701a75;
    margin: 15px 0;
}
.highlight {
    color: #701a75;
    font-weight: bold;
}
`;

const commonFooter = `
<div class="footer">
    <p><strong>Directorate of Research, Innovation and Development<br>
    University of Benin<br>
    PMB 1154, Benin City, Nigeria</strong></p>
</div>`;

const invitationTemplate = (inviteUrl) => `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>Research Portal Invitation</h1>
    </div>
    
    <div class="content">
        <p>You have been invited to join our Research Portal as a researcher contributor.</p>
        
        <p>Our portal allows you to publish research articles, collaborate with other researchers, and share your work with the academic community.</p>
        
        <p>Please click the button below to complete your profile:</p>
        
        <a href="${inviteUrl}" class="button">Complete Your Profile</a>
        
        <p>This invitation link will expire in 30 days.</p>
        
        <p>If you have any questions about this invitation, please contact our support team.</p>
    </div>
    
    ${commonFooter}
</body>
</html>
`;

const credentialsTemplate = (email, password, loginUrl) => `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>Your Research Portal Account Credentials</h1>
    </div>
    
    <div class="content">
        <p>Your account has been created successfully on the Research Portal.</p>
        
        <div class="credentials">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>Please click the button below to log in to your account:</p>
        
        <a href="${loginUrl}" class="button">Log In to Portal</a>
        
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        
        <p>If you did not expect to receive this email, please contact our support team immediately.</p>
    </div>
    
    ${commonFooter}
</body>
</html>
`;

const notificationTemplate = (researcher, articleTitle, portalUrl) => `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>New Research Publication</h1>
    </div>
    
    <div class="content">
        <p><strong>${researcher}</strong> has published a new research article:</p>
        
        <div class="article-title">"${articleTitle}"</div>
        
        <p>This new publication is now available on our research portal for the academic community to read and engage with.</p>
        
        <p>Visit our research portal to read the full article and explore other recent publications.</p>
        
        <a href="${portalUrl}" class="button">Visit Research Portal</a>
        
        <p>Stay connected with the latest research and discoveries from our academic community.</p>
    </div>
    
    ${commonFooter}
</body>
</html>
`;

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // Use secure for port 465, otherwise false
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Enhanced connection settings to fix SMTP timeout issues
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
      requireTLS: true, // Always use TLS
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
        ciphers: 'SSLv3',
      },
    });

    this.frontendUrl = process.env.FRONTEND_URL;
    this.emailFrom = process.env.EMAIL_FROM;

    if (!this.frontendUrl || !this.emailFrom) {
      throw new Error(
        'FRONTEND_URL and EMAIL_FROM must be defined in environment variables'
      );
    }

    // Verify SMTP connection on startup
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      // Don't throw here, just log the error
    }
  }

  async sendInvitationEmail(email, token) {
    const inviteUrl = `${this.frontendUrl}/researcher-register/${token}`;

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Invitation to join the Research Portal',
        html: invitationTemplate(inviteUrl),
        // Add additional options for better delivery
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Research Portal',
        },
      });
      logger.info(`Invitation email sent successfully to: ${email}`);
    } catch (error) {
      logger.error('Email error details:', error);
      throw new BadRequestError('Failed to send invitation email');
    }
  }

  async sendCredentialsEmail(email, password) {
    const loginUrl = `${this.frontendUrl}/researcher-login`;

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Your Research Portal Account Credentials',
        html: credentialsTemplate(email, password, loginUrl),
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Research Portal',
        },
      });
      logger.info(`Credentials email sent successfully to: ${email}`);
    } catch (error) {
      logger.error('Email error details:', error);
      throw new BadRequestError('Failed to send credentials email');
    }
  }

  async sendNotificationEmail(email, researcher, articleTitle) {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: `New Research Published by ${researcher}`,
        html: notificationTemplate(researcher, articleTitle, this.frontendUrl),
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Research Portal',
        },
      });
      logger.info(`Notification email sent successfully to: ${email}`);
    } catch (error) {
      logger.error('Failed to send notification email:', error);
      // Don't throw error here to prevent article publication from failing
    }
  }

  // Additional utility method to send bulk emails
  async sendBulkEmails(emails, subject, htmlContent) {
    const promises = emails.map((email) =>
      this.transporter
        .sendMail({
          from: this.emailFrom,
          to: email,
          subject: subject,
          html: htmlContent,
          headers: {
            'X-Priority': '3',
            'X-Mailer': 'Research Portal',
          },
        })
        .catch((error) => {
          logger.error(`Failed to send email to ${email}:`, error);
          return { email, error };
        })
    );

    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const failed = results.filter(
        (result) => result.status === 'rejected'
      ).length;

      logger.info(
        `Bulk email results: ${successful} successful, ${failed} failed`
      );
      return { successful, failed };
    } catch (error) {
      logger.error('Bulk email send error:', error);
      throw new BadRequestError('Failed to send bulk emails');
    }
  }

  // Graceful shutdown
  async closeConnection() {
    try {
      this.transporter.close();
      logger.info('SMTP connection closed');
    } catch (error) {
      logger.error('Error closing SMTP connection:', error);
    }
  }
}

export default new EmailService();
