// models/dashboardModel.js
const db = require('../config/database');

/**
 * Returns counts for the four summary cards.
 * Using Promise.all runs all four queries in parallel — faster
 * than awaiting them one at a time.
 */
exports.getSummary = async () => {
  const [
    [totalStudents],
    [totalSubjects],
    [totalEnrollments],
    [activeEnrollments]
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) AS count FROM students'),
    db.execute(
      'SELECT COUNT(*) AS count FROM subjects WHERE is_active = 1'
    ),
    db.execute('SELECT COUNT(*) AS count FROM enrollments'),
    db.execute(
      `SELECT COUNT(*) AS count FROM enrollments
       WHERE status = 'enrolled'`
    )
  ]);

  return {
    totalStudents:     totalStudents[0].count,
    totalSubjects:     totalSubjects[0].count,
    totalEnrollments:  totalEnrollments[0].count,
    activeEnrollments: activeEnrollments[0].count
  };
};

/**
 * Returns the 5 most recently enrolled students for the
 * "Recent Activity" table on the dashboard.
 */
exports.getRecentEnrollments = async () => {
  const [rows] = await db.execute(
    `SELECT
       s.student_id,
       s.first_name,
       s.last_name,
       s.course,
       s.year_level,
       sub.subject_name,
       sub.subject_code,
       e.enrolled_at,
       e.status
     FROM enrollments e
     JOIN students s  ON s.id  = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     ORDER BY e.enrolled_at DESC
     LIMIT 5`
  );
  return rows;
};