// models/reportModel.js
const db = require('../config/database');

/**
 * Fetch enrollment records with optional filters.
 * All parameters are optional — omitting them returns everything.
 */
exports.getEnrollmentReport = async ({
  search     = '',
  course     = '',
  year_level = '',
  status     = '',
  page       = 1,
  limit      = 15
} = {}) => {
  const offset = (page - 1) * limit;
  const like   = `%${search}%`;

  // Build dynamic WHERE clauses
  const conditions = [
    '(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)'
  ];
  const params = [like, like, like];

  if (course) {
    conditions.push('s.course = ?');
    params.push(course);
  }

  if (year_level) {
    conditions.push('s.year_level = ?');
    params.push(year_level);
  }

  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT
       s.student_id,
       s.first_name,
       s.last_name,
       s.course,
       s.year_level,
       s.email,
       sub.subject_code,
       sub.subject_name,
       sub.units,
       sub.schedule,
       sub.room,
       sub.instructor,
       e.status,
       e.enrolled_at
     FROM enrollments e
     JOIN students s   ON s.id   = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     ${where}
     ORDER BY s.last_name, s.first_name, sub.subject_code
     LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM enrollments e
     JOIN students s   ON s.id   = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     ${where}`,
    params
  );

  return { rows, total };
};

/**
 * Summary counts shown at the top of the report page.
 */
exports.getReportSummary = async () => {
  const [
    [totalStudents],
    [totalSubjects],
    [totalEnrollments],
    [totalUnits],
    [courses]
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) AS count FROM students'),
    db.execute(
      'SELECT COUNT(*) AS count FROM subjects WHERE is_active = 1'
    ),
    db.execute(
      "SELECT COUNT(*) AS count FROM enrollments WHERE status = 'enrolled'"
    ),
    db.execute(
      `SELECT COALESCE(SUM(sub.units), 0) AS count
       FROM enrollments e
       JOIN subjects sub ON sub.id = e.subject_id
       WHERE e.status = 'enrolled'`
    ),
    db.execute(
      'SELECT DISTINCT course FROM students ORDER BY course ASC'
    )
  ]);

  return {
    totalStudents:    totalStudents[0].count,
    totalSubjects:    totalSubjects[0].count,
    totalEnrollments: totalEnrollments[0].count,
    totalUnits:       totalUnits[0].count,
    courses:          courses.map(r => r.course)
  };
};

/**
 * Fetch ALL enrollment records (no pagination) for CSV export.
 */
exports.getAllForExport = async ({
  search     = '',
  course     = '',
  year_level = '',
  status     = ''
} = {}) => {
  const like       = `%${search}%`;
  const conditions = [
    '(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)'
  ];
  const params = [like, like, like];

  if (course)     { conditions.push('s.course = ?');     params.push(course); }
  if (year_level) { conditions.push('s.year_level = ?'); params.push(year_level); }
  if (status)     { conditions.push('e.status = ?');     params.push(status); }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT
       s.student_id,
       s.first_name,
       s.last_name,
       s.course,
       s.year_level,
       s.email,
       sub.subject_code,
       sub.subject_name,
       sub.units,
       sub.schedule,
       sub.room,
       sub.instructor,
       e.status,
       e.enrolled_at
     FROM enrollments e
     JOIN students s   ON s.id   = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     ${where}
     ORDER BY s.last_name, s.first_name, sub.subject_code`,
    params
  );

  return rows;
};