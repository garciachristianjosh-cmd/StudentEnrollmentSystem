// models/studentModel.js
const db = require('../config/database');

// ─── Used after login ─────────────────────────────────────────
exports.findByUserId = async (userId) => {
  const [rows] = await db.execute(
    `SELECT s.*, u.username, u.role
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ?`,
    [userId]
  );
  return rows[0];
};

exports.clearPasswordChangeFlag = async (userId) => {
  await db.execute(
    'UPDATE students SET must_change_password = 0 WHERE user_id = ?',
    [userId]
  );
};

// ─── List with search + pagination ───────────────────────────
exports.getAll = async ({ search = '', page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const like   = `%${search}%`;

  const [rows] = await db.execute(
    `SELECT s.*, u.username, u.is_active
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.student_id  LIKE ?
        OR s.first_name  LIKE ?
        OR s.last_name   LIKE ?
        OR s.email       LIKE ?
        OR s.course      LIKE ?
     ORDER BY s.last_name, s.first_name
     LIMIT ? OFFSET ?`,
    [like, like, like, like, like, String(limit), String(offset)]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM students s
     WHERE s.student_id  LIKE ?
        OR s.first_name  LIKE ?
        OR s.last_name   LIKE ?
        OR s.email       LIKE ?
        OR s.course      LIKE ?`,
    [like, like, like, like, like]
  );

  return { rows, total };
};

// ─── Single student ───────────────────────────────────────────
exports.findById = async (id) => {
  const [rows] = await db.execute(
    `SELECT s.*, u.username, u.is_active
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0];
};

// ─── Check duplicates (exclude current row on edit) ──────────
exports.isDuplicate = async (field, value, excludeId = null) => {
  let sql    = `SELECT id FROM students WHERE ${field} = ?`;
  let params = [value];

  if (excludeId) {
    sql    += ' AND id != ?';
    params.push(excludeId);
  }

  const [rows] = await db.execute(sql, params);
  return rows.length > 0;
};

exports.isUsernameTaken = async (username, excludeUserId = null) => {
  let sql    = 'SELECT id FROM users WHERE username = ?';
  let params = [username];

  if (excludeUserId) {
    sql    += ' AND id != ?';
    params.push(excludeUserId);
  }

  const [rows] = await db.execute(sql, params);
  return rows.length > 0;
};

// ─── Create (two-table insert wrapped in a transaction) ───────
exports.create = async (userData, studentData) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, "student")',
      [userData.username, userData.password]
    );
    const userId = userResult.insertId;

    await conn.execute(
      `INSERT INTO students
         (user_id, student_id, first_name, middle_name, last_name,
          email, contact_number, course, year_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        studentData.student_id,
        studentData.first_name,
        studentData.middle_name || null,
        studentData.last_name,
        studentData.email,
        studentData.contact_number || null,
        studentData.course,
        studentData.year_level
      ]
    );

    await conn.commit();
    return userId;

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ─── Update ───────────────────────────────────────────────────
exports.update = async (id, data) => {
  await db.execute(
    `UPDATE students
     SET first_name      = ?,
         middle_name     = ?,
         last_name       = ?,
         email           = ?,
         contact_number  = ?,
         course          = ?,
         year_level      = ?
     WHERE id = ?`,
    [
      data.first_name,
      data.middle_name || null,
      data.last_name,
      data.email,
      data.contact_number || null,
      data.course,
      data.year_level,
      id
    ]
  );
};

// ─── Toggle active status ─────────────────────────────────────
exports.toggleStatus = async (userId, status) => {
  await db.execute(
    'UPDATE users SET is_active = ? WHERE id = ?',
    [status, userId]
  );
};

// ─── Delete ───────────────────────────────────────────────────
exports.delete = async (id) => {
  // Fetch user_id first so we can delete the users row
  // The FK cascade will delete the students row automatically
  const [rows] = await db.execute(
    'SELECT user_id FROM students WHERE id = ?',
    [id]
  );
  if (!rows[0]) return;

  await db.execute('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
};