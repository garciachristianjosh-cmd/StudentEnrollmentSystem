// models/passwordResetModel.js
const db     = require('../config/database');
const crypto = require('crypto');

/**
 * Find a student by email — checks students + users tables.
 */
exports.findStudentByEmail = async (email) => {
  const [rows] = await db.execute(
    `SELECT s.id AS student_id, s.first_name, s.last_name,
            s.email, u.id AS user_id, u.is_active
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.email = ?`,
    [email]
  );
  return rows[0];
};

/**
 * Create a reset token for a user.
 * Deletes any existing token for that user first
 * so only one active reset exists at a time.
 */
exports.createToken = async (userId) => {
  // Delete any existing token for this user
  await db.execute(
    'DELETE FROM password_resets WHERE user_id = ?',
    [userId]
  );

  // Generate a cryptographically secure random token
  const token     = crypto.randomBytes(32).toString('hex'); // 64 chars
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.execute(
    `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );

  return token;
};

/**
 * Find a valid (not expired) token.
 */
exports.findValidToken = async (token) => {
  const [rows] = await db.execute(
    `SELECT pr.*, u.id AS user_id
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.token = ?
       AND pr.expires_at > NOW()`,
    [token]
  );
  return rows[0];
};

/**
 * Delete a token after use.
 * Called immediately after a successful password reset.
 */
exports.deleteToken = async (token) => {
  await db.execute(
    'DELETE FROM password_resets WHERE token = ?',
    [token]
  );
};

/**
 * Clean up all expired tokens.
 * Optional — call periodically to keep the table tidy.
 */
exports.purgeExpired = async () => {
  await db.execute(
    'DELETE FROM password_resets WHERE expires_at <= NOW()'
  );
};