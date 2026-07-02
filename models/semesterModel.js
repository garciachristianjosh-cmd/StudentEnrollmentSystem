const db = require('../config/database');

exports.getAll = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM semesters ORDER BY created_at DESC'
  );
  return rows;
};

exports.getActive = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM semesters WHERE is_active = 1 LIMIT 1'
  );
  return rows[0] || null;
};

exports.findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM semesters WHERE id = ?', [id]
  );
  return rows[0];
};

exports.create = async (data) => {
  const [result] = await db.execute(
    'INSERT INTO semesters (school_year, semester) VALUES (?, ?)',
    [data.school_year, data.semester]
  );
  return result.insertId;
};

exports.setActive = async (id) => {
  await db.execute('UPDATE semesters SET is_active = 0');
  await db.execute('UPDATE semesters SET is_active = 1 WHERE id = ?', [id]);
};

exports.delete = async (id) => {
  await db.execute('DELETE FROM semesters WHERE id = ?', [id]);
};

exports.deactivate = async (id) => {
  await db.execute(
    'UPDATE semesters SET is_active = 0 WHERE id = ?', [id]
  );
};