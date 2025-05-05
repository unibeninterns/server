import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create transporter (configured for Namecheap PrivateEmail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Should be 'mail.privateemail.com'
  port: parseInt(process.env.SMTP_PORT), // 465 (SSL) or 587 (TLS)
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // Must be full email (e.g., user@domain.com)
    pass: process.env.SMTP_PASS, // Use App Password if 2FA is enabled
  },
});

// Enable SMTP debugging (logs the entire SMTP conversation)
transporter.on('debug', (info) => {
  console.log('🔍 SMTP Debug:', info);
});

/**
 * Test SMTP connection and send a test email
 */
async function testEmail() {
  try {
    console.log('🔄 Testing SMTP connection...');

    // Verify SMTP connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified!');

    // Send test email
    const testRecipient =
      process.env.TEST_EMAIL_TO || 'raymond.omoyakhi@physci.uniben.edu'; // Change this
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: testRecipient,
      subject: '🚀 SMTP Test Email',
      text: 'If you received this, your SMTP setup is working!',
      html: '<p>If you received this, your <strong>SMTP setup is working!</strong></p>',
    };

    console.log(`📤 Attempting to send test email to: ${testRecipient}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Error:', error);
    process.exit(1); // Exit with error code
  }
}

// Run the test
testEmail();
