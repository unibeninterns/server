import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { BadRequestError } from '../utils/customErrors.js';
import validateEnv from '../utils/validateEnv.js';

validateEnv();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.frontendUrl = process.env.FRONTEND_URL;
    this.emailFrom = process.env.EMAIL_FROM;

    if (!this.frontendUrl || !this.emailFrom) {
      throw new Error(
        'FRONTEND_URL and EMAIL_FROM must be defined in environment variables'
      );
    }
  }

  async sendInvitationEmail(email, token) {
    const inviteUrl = `${this.frontendUrl}/researcher-register/${token}`;

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: 'Invitation to join the Research Portal',
        html: `
          <h1>Research Portal Invitation</h1>
          <p>You have been invited to join our research portal as a contributor.</p>
          <p>Please click the link below to complete your profile:</p>
          <a href="${inviteUrl}">${inviteUrl}</a>
          <p>This link will expire in 30 days.</p>
        `,
      });
      logger.info('Invitation mail sent successfully');
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
        html: `
          <h1>Research Portal Account Created</h1>
          <p>Your account has been created successfully. Please use the following credentials to log in:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p>Please click the link below to log in to your account:</p>
          <a href="${loginUrl}">${loginUrl}</a>
          <p>If you didn't request this account, please contact our support team.</p>
        `,
      });
    } catch (error) {
      throw new BadRequestError('Failed to send credentials email');
    }
  }

  async sendNotificationEmail(email, researcher, articleTitle) {
    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: email,
        subject: `New Research Published by ${researcher}`,
        html: `
          <h1>New Research Publication</h1>
          <p>${researcher} has published a new article: "${articleTitle}"</p>
          <p>Visit our research portal to read the full article.</p>
          <a href="${this.frontendUrl}">Visit Research Portal</a>
        `,
      });
    } catch (error) {
      logger.error('Failed to send notification email:', error);
      // Don't throw error here to prevent article publication from failing
    }
  }
}

export default new EmailService();
