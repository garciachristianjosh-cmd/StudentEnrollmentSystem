// models/enrollmentModel.js
const db = require('../config/database');

// ─── Configurable max units ───────────────────────────────────
const MAX_UNITS = 25;
exports.MAX_UNITS = MAX_UNITS;

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
 * Get total enrolled units for a student.
 */
exports.getTotalUnits = async (studentId) => {
  const [[{ total }]] = await db.execute(
    `SELECT COALESCE(SUM(sub.units), 0) AS total
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.student_id = ?
       AND e.status = 'enrolled'`,
    [studentId]
  );
  return parseInt(total);
};

/**
 * Check which of the given subject IDs are already enrolled
 * by the student. Returns array of duplicate subject IDs.
 */
exports.findDuplicates = async (studentId, subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return [];

  const placeholders = subjectIds.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT subject_id
     FROM enrollments
     WHERE student_id  = ?
       AND subject_id IN (${placeholders})`,
    [studentId, ...subjectIds]
  );
  return rows.map(r => r.subject_id);
};

/**
 * Check which of the given subject IDs are inactive.
 * Returns array of inactive subject objects.
 */
exports.findInactive = async (subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return [];

  const placeholders = subjectIds.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT id, subject_code, subject_name
     FROM subjects
     WHERE id IN (${placeholders})
       AND is_active = 0`,
    subjectIds
  );
  return rows;
};

/**
 * Get units for the given subject IDs.
 * Used to check if adding these subjects would exceed the max.
 */
exports.getUnitsForSubjects = async (subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return 0;

  const placeholders = subjectIds.map(() => '?').join(',');
  const [[{ total }]] = await db.execute(
    `SELECT COALESCE(SUM(units), 0) AS total
     FROM subjects
     WHERE id IN (${placeholders})`,
    subjectIds
  );
  return parseInt(total);
};

/**
 * Enroll a student in multiple subjects.
 * Uses INSERT IGNORE as final safety net against duplicates.
 */
exports.enrollSubjects = async (studentId, subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return;

  const placeholders = subjectIds.map(() => '(?, ?)').join(', ');
  const values       = subjectIds.flatMap(sid => [studentId, sid]);

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
 */
exports.checkStudentConflicts = async (studentId, subjectIds) => {
  if (!subjectIds || subjectIds.length === 0) return [];

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

      const sharedDays   = newDays.filter(d => existDays.includes(d));
      if (sharedDays.length === 0) continue;

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

    for (const otherNew of incoming) {
      if (otherNew.id === newSub.id) continue;
      if (!otherNew.schedule_days)   continue;

      const otherDays  = otherNew.schedule_days.split(',').map(d => d.trim());
      const otherStart = otherNew.schedule_start;
      const otherEnd   = otherNew.schedule_end;

      const sharedDays   = newDays.filter(d => otherDays.includes(d));
      if (sharedDays.length === 0) continue;

      const timesOverlap = newStart < otherEnd && otherStart < newEnd;
      if (!timesOverlap) continue;

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