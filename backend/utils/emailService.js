/**
 * Email Service
 * Handles transactional email delivery for password recovery
 * Supports configured SMTP or Ethereal / simulated transport for lab demonstration
 */

const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  // If real SMTP credentials are provided in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[EmailService] Configured with production SMTP transport.');
  } else {
    // Development / Lab Demonstration: Create Ethereal test account or simulated logger
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[EmailService] Initialized Ethereal test account for lab demonstration: ${testAccount.user}`);
    } catch (err) {
      console.warn(`[EmailService] Falling back to console mailer: ${err.message}`);
      transporter = {
        sendMail: async (options) => {
          console.log('\n--- [SIMULATED EMAIL DISPATCH] ---');
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Content:\n${options.text}`);
          console.log('----------------------------------\n');
          return { messageId: 'simulated-' + Date.now(), previewUrl: null };
        }
      };
    }
  }

  return transporter;
};

/**
 * Send Password Recovery Email
 */
const sendPasswordResetEmail = async ({ to, resetToken, candidateName }) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    const mailTransporter = await getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"IEM Admissions Office" <admissions@iem.edu.in>',
      to,
      subject: 'IEM Admission Portal - Password Reset Request',
      text: `Hello ${candidateName || 'Applicant'},\n\nYou requested a password reset for your IEM Student Admission Portal account.\n\nPlease reset your password using the following link or token (valid for 1 hour):\n\nReset Link: ${resetUrl}\nReset Token: ${resetToken}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nIEM Admissions Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #071E3D; padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; color: #F2A900; letter-spacing: 1px;">INSTITUTE OF ENGINEERING & MANAGEMENT</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Student Admission Portal</p>
          </div>
          <div style="padding: 24px; color: #1e293b;">
            <p style="font-size: 16px;">Dear <strong>${candidateName || 'Applicant'}</strong>,</p>
            <p>We received a request to reset the password for your admission portal account.</p>
            <p>Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #071E3D; color: #F2A900; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Or enter this reset token directly in the portal:</p>
            <div style="background-color: #f8fafc; padding: 12px; border: 1px dashed #cbd5e1; font-family: monospace; font-size: 14px; word-break: break-all;">
              ${resetToken}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you did not request a password reset, you can safely disregard this email.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
            IEM Kolkata &copy; ${new Date().getFullYear()} Admission Office. All rights reserved.
          </div>
        </div>
      `
    };

    const info = await mailTransporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log(`[EmailService] Ethereal Email Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error(`[EmailService Error] ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  getTransporter
};

