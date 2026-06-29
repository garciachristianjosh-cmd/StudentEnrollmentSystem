// models/userModel.js
const db = require('../config/database');

/**
 * Find a user by username.
 * Returns the full user row or undefined if not found.
 */
exports.findByUsername = async (username) => {
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username]
  );
  return rows[0]; // undefined if no match
};

/**
 * Find a user by their primary key ID.
 */
exports.findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT id, username, role, is_active FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
};

/**
 * Update a user's password.
 */
exports.updatePassword = async (id, hashedPassword) => {
  await db.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, id]
  );
};