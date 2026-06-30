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

/**
 * Check if a student's existing enrollments conflict with
 * any of the subjects being added.
 *
 * Returns an array of conflict objects describing each clash.
 */
exports.checkStudentConflicts = async (studentId, subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return [];

  // Get the student's currently enrolled subjects with schedule data
  const [enrolled] = await db.execute(
    `SELECT
       sub.id,
       sub.subject_code,
       sub.subject_name,
       sub.schedule,
       sub.schedule_days,
       sub.schedule_start,
       sub.schedule_end
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.student_id = ?
       AND e.status = 'enrolled'
       AND sub.schedule_start IS NOT NULL
       AND sub.schedule_end   IS NOT NULL`,
    [studentId]
  );

  // Get the subjects being added with schedule data
  const placeholders = subjectIds.map(() => '?').join(',');
  const [incoming] = await db.execute(
    `SELECT
       id,
       subject_code,
       subject_name,
       schedule,
       schedule_days,
       schedule_start,
       schedule_end
     FROM subjects
     WHERE id IN (${placeholders})
       AND schedule_start IS NOT NULL
       AND schedule_end   IS NOT NULL`,
    subjectIds
  );

  const conflicts = [];

  // Check every incoming subject against every enrolled subject
  for (const newSub of incoming) {
    if (!newSub.schedule_days) continue;

    const newDays  = newSub.schedule_days.split(',').map(d => d.trim());
    const newStart = newSub.schedule_start;
    const newEnd   = newSub.schedule_end;

    for (const existing of enrolled) {
      if (!existing.schedule_days) continue;

      const existDays  = existing.schedule_days.split(',').map(d => d.trim());
      const existStart = existing.schedule_start;
      const existEnd   = existing.schedule_end;

      // Check shared days
      const sharedDays = newDays.filter(d => existDays.includes(d));
      if (sharedDays.length === 0) continue;

      // Check time overlap: start1 < end2 AND start2 < end1
      const timesOverlap = newStart < existEnd && existStart < newEnd;
      if (!timesOverlap) continue;

      conflicts.push({
        newSubject:      `${newSub.subject_code} — ${newSub.subject_name}`,
        existingSubject: `${existing.subject_code} — ${existing.subject_name}`,
        sharedDays:      sharedDays.join(', '),
        newSchedule:     newSub.schedule,
        existSchedule:   existing.schedule
      });
    }

    // Also check conflicts between the incoming subjects themselves
    for (const otherNew of incoming) {
      if (otherNew.id === newSub.id)   continue;
      if (!otherNew.schedule_days)     continue;

      const otherDays  = otherNew.schedule_days.split(',').map(d => d.trim());
      const otherStart = otherNew.schedule_start;
      const otherEnd   = otherNew.schedule_end;

      const sharedDays = newDays.filter(d => otherDays.includes(d));
      if (sharedDays.length === 0) continue;

      const timesOverlap = newStart < otherEnd && otherStart < newEnd;
      if (!timesOverlap) continue;

      // Avoid adding the same conflict twice (A vs B and B vs A)
      const alreadyAdded = conflicts.some(c =>
        c.newSubject      === `${otherNew.subject_code} — ${otherNew.subject_name}` &&
        c.existingSubject === `${newSub.subject_code} — ${newSub.subject_name}`
      );

      if (!alreadyAdded) {
        conflicts.push({
          newSubject:      `${newSub.subject_code} — ${newSub.subject_name}`,
          existingSubject: `${otherNew.subject_code} — ${otherNew.subject_name}`,
          sharedDays:      sharedDays.join(', '),
          newSchedule:     newSub.schedule,
          existSchedule:   otherNew.schedule
        });
      }
    }
  }

  return conflicts;
};