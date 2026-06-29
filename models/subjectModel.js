// models/subjectModel.js
const db = require('../config/database');

// ─── List with search + pagination ───────────────────────────
exports.getAll = async ({ search = '', page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const like   = `%${search}%`;

  const [rows] = await db.execute(
    `SELECT * FROM subjects
     WHERE subject_code LIKE ?
        OR subject_name LIKE ?
        OR instructor   LIKE ?
        OR room         LIKE ?
     ORDER BY subject_code ASC
     LIMIT ? OFFSET ?`,
    [like, like, like, like, String(limit), String(offset)]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM subjects
     WHERE subject_code LIKE ?
        OR subject_name LIKE ?
        OR instructor   LIKE ?
        OR room         LIKE ?`,
    [like, like, like, like]
  );

  return { rows, total };
};

// ─── Single subject ───────────────────────────────────────────
exports.findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM subjects WHERE id = ?',
    [id]
  );
  return rows[0];
};

// ─── Duplicate check ──────────────────────────────────────────
exports.isDuplicate = async (field, value, excludeId = null) => {
  let sql    = `SELECT id FROM subjects WHERE ${field} = ?`;
  let params = [value];

  if (excludeId) {
    sql    += ' AND id != ?';
    params.push(excludeId);
  }

  const [rows] = await db.execute(sql, params);
  return rows.length > 0;
};

// ─── Create ───────────────────────────────────────────────────
exports.create = async (data) => {
  const [result] = await db.execute(
    `INSERT INTO subjects
       (subject_code, subject_name, units, schedule, room, instructor)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.subject_code,
      data.subject_name,
      data.units,
      data.schedule,
      data.room,
      data.instructor || null
    ]
  );
  return result.insertId;
};

// ─── Update ───────────────────────────────────────────────────
exports.update = async (id, data) => {
  await db.execute(
    `UPDATE subjects
     SET subject_code = ?,
         subject_name = ?,
         units        = ?,
         schedule     = ?,
         room         = ?,
         instructor   = ?
     WHERE id = ?`,
    [
      data.subject_code,
      data.subject_name,
      data.units,
      data.schedule,
      data.room,
      data.instructor || null,
      id
    ]
  );
};

// ─── Toggle active status ─────────────────────────────────────
exports.toggleStatus = async (id, status) => {
  await db.execute(
    'UPDATE subjects SET is_active = ? WHERE id = ?',
    [status, id]
  );
};

// ─── Delete ───────────────────────────────────────────────────
exports.delete = async (id) => {
  await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
};

// ─── Get all active subjects (used by enrollment module) ──────
exports.getAllActive = async () => {
  const [rows] = await db.execute(
    `SELECT * FROM subjects WHERE is_active = 1 ORDER BY subject_code ASC`
  );
  return rows;
};
