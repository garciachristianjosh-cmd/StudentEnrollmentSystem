// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   parseInt(process.env.MAIL_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/**
 * Send the password reset email.
 * @param {string} to      - Recipient email address
 * @param {string} name    - Recipient's first name
 * @param {string} token   - The reset token
 */
exports.sendPasswordReset = async (to, name, token) => {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password/${token}`;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject: 'Password Reset Request — Student Enrollment System',
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;
                  margin:0 auto;padding:2rem;background:#f9fafb;
                  border-radius:12px;">
        <h2 style="color:#1e2a3a;margin-bottom:0.5rem;">
          Password Reset Request
        </h2>
        <p style="color:#6b7280;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="color:#6b7280;">
          We received a request to reset your password for the
          Student Enrollment System. Click the button below to
          set a new password. This link expires in
          <strong>1 hour</strong>.
        </p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${resetUrl}"
             style="background:#3b82f6;color:#fff;
                    padding:0.75rem 2rem;border-radius:8px;
                    text-decoration:none;font-weight:600;
                    display:inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color:#9ca3af;font-size:0.85rem;">
          If you did not request a password reset, ignore this email.
          Your password will not change.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;
                   margin:1.5rem 0;" />
        <p style="color:#9ca3af;font-size:0.75rem;">
          Or copy this link into your browser:<br/>
          <a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">
            ${resetUrl}
          </a>
        </p>
      </div>
    `
  });
};