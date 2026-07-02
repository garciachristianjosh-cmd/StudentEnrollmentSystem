const db = require('../config/database');

exports.getSummary = async () => {
  const [
    [totalStudentsResult],
    [totalSubjectsResult],
    [totalEnrollmentsResult],
    [activeEnrollmentsResult],
    [totalUnitsResult],
    [pendingApplicantsResult]
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) AS count FROM students'),
    db.execute('SELECT COUNT(*) AS count FROM subjects WHERE is_active = 1'),
    db.execute('SELECT COUNT(*) AS count FROM enrollments'),
    db.execute("SELECT COUNT(*) AS count FROM enrollments WHERE status = 'enrolled'"),
    db.execute(
      `SELECT COALESCE(SUM(sub.units), 0) AS count
       FROM enrollments e
       JOIN subjects sub ON sub.id = e.subject_id
       WHERE e.status = 'enrolled'`
    ),
    db.execute("SELECT COUNT(*) AS count FROM applicants WHERE status = 'Pending'")
  ]);

  return {
    totalStudents:      totalStudentsResult[0].count,
    totalSubjects:      totalSubjectsResult[0].count,
    totalEnrollments:   totalEnrollmentsResult[0].count,
    activeEnrollments:  activeEnrollmentsResult[0].count,
    totalUnits:         totalUnitsResult[0].count,
    pendingApplicants:  pendingApplicantsResult[0].count
  };
};

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
     JOIN students s   ON s.id   = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     ORDER BY e.enrolled_at DESC
     LIMIT 5`
  );
  return rows;
};

exports.getCourseBreakdown = async () => {
  const [rows] = await db.execute(
    `SELECT
       s.course,
       COUNT(DISTINCT s.id)        AS student_count,
       COUNT(e.id)                 AS enrollment_count,
       COALESCE(SUM(sub.units), 0) AS total_units
     FROM students s
     LEFT JOIN enrollments e  ON e.student_id = s.id
                              AND e.status = 'enrolled'
     LEFT JOIN subjects sub   ON sub.id = e.subject_id
     GROUP BY s.course
     ORDER BY student_count DESC`
  );
  return rows;
};