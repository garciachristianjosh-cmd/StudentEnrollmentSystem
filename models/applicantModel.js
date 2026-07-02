const db = require('../config/database');

exports.getAll = async ({ search = '', status = '', page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const like   = `%${search}%`;

  const conditions = [
    '(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR desired_course LIKE ?)'
  ];
  const params = [like, like, like, like];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT * FROM applicants ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM applicants ${where}`,
    params
  );

  return { rows, total };
};

exports.findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM applicants WHERE id = ?', [id]
  );
  return rows[0];
};

exports.create = async (data) => {
  const [result] = await db.execute(
    `INSERT INTO applicants
       (first_name, middle_name, last_name, birthday, gender,
        email, contact_number, address, desired_course, desired_year_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.first_name,
      data.middle_name || null,
      data.last_name,
      data.birthday,
      data.gender,
      data.email,
      data.contact_number,
      data.address,
      data.desired_course,
      data.desired_year_level
    ]
  );
  return result.insertId;
};

exports.updateStatus = async (id, status, remarks = null) => {
  await db.execute(
    'UPDATE applicants SET status = ?, remarks = ? WHERE id = ?',
    [status, remarks, id]
  );
};

exports.isDuplicateEmail = async (email) => {
  const [rows] = await db.execute(
    'SELECT id FROM applicants WHERE email = ?', [email]
  );
  return rows.length > 0;
};