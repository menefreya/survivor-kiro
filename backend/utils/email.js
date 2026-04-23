const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send a password reset email
 * @param {string} toEmail - Recipient email
 * @param {string} resetToken - Raw reset token
 */
async function sendPasswordResetEmail(toEmail, resetToken) {
  const frontendUrl = (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*')
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173';

  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Survivor Fantasy League" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: 'Reset your password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your Survivor Fantasy League account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2d6a4f;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          Reset Password
        </a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">Link: ${resetUrl}</p>
      </div>
    `
  });
}

module.exports = { sendPasswordResetEmail };
