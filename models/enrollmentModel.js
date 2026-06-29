// models/enrollmentModel.js
const db = require('../config/database');

/**
 * Get all subjects a student is currently enrolled in.
 */
exports.getByStudent = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT
       e.id        AS enrollment_id,
       e.status,
       e.enrolled_at,
       sub.id      AS subject_id,
       sub.subject_code,
       sub.subject_name,
       sub.units,
       sub.schedule,
       sub.room,
       sub.instructor
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.student_id = ?
     ORDER BY sub.subject_code ASC`,
    [studentId]
  );
  return rows;
};

/**
 * Get all active subjects NOT yet enrolled in by this student.
 * Used to populate the "available subjects" panel.
 */
exports.getAvailable = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT sub.*
     FROM subjects sub
     WHERE sub.is_active = 1
       AND sub.id NOT IN (
         SELECT subject_id
         FROM enrollments
         WHERE student_id = ?
       )
     ORDER BY sub.subject_code ASC`,
    [studentId]
  );
  return rows;
};

/**
 * Enroll a student in multiple subjects.
 * Skips duplicates safely using INSERT IGNORE.
 */
exports.enrollSubjects = async (studentId, subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return;

  // Build placeholders: (?,?), (?,?), ...
  const placeholders = subjectIds.map(() => '(?, ?)').join(', ');
  const values       = subjectIds.flatMap(sid => [studentId, sid]);

  // INSERT IGNORE silently skips rows that violate the UNIQUE constraint
  // This is our second line of defense after the app-level duplicate check
  await db.execute(
    `INSERT IGNORE INTO enrollments (student_id, subject_id)
     VALUES ${placeholders}`,
    values
  );
};

/**
 * Remove a single enrollment record.
 */
exports.remove = async (enrollmentId, studentId) => {
  // Include studentId in WHERE clause as a safety check —
  // prevents one student's enrollment from being deleted
  // via a manipulated URL belonging to another student
  await db.execute(
    'DELETE FROM enrollments WHERE id = ? AND student_id = ?',
    [enrollmentId, studentId]
  );
};

/**
 * Count how many subjects a student is actively enrolled in.
 */
exports.countByStudent = async (studentId) => {
  const [[{ count }]] = await db.execute(
    `SELECT COUNT(*) AS count
     FROM enrollments
     WHERE student_id = ? AND status = 'enrolled'`,
    [studentId]
  );
  return count;
};

/**
 * Get full enrollment details for a student.
 * Used by the student dashboard and schedule pages.
 */
exports.getStudentSchedule = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT
       e.id          AS enrollment_id,
       e.status,
       e.enrolled_at,
       sub.subject_code,
       sub.subject_name,
       sub.units,
       sub.schedule,
       sub.room,
       sub.instructor
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.student_id = ?
       AND e.status = 'enrolled'
     ORDER BY sub.subject_code ASC`,
    [studentId]
  );
  return rows;
};