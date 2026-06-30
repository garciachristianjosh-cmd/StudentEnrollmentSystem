// models/subjectModel.js
const db = require('../config/database');

/**
 * Build the human-readable schedule string from structured fields.
 * e.g. days="MWF", start="07:30:00", end="09:00:00"
 *   -> "MWF 07:30 AM – 09:00 AM"
 */
function buildScheduleString(days, start, end) {
  if (!days && !start && !end) return '';

  const dayMap = {
    'Mon': 'M', 'Tue': 'T', 'Wed': 'W',
    'Thu': 'Th', 'Fri': 'F', 'Sat': 'Sa'
  };

  function formatTime(val) {
    if (!val) return '';
    const parts  = val.split(':');
    let   h      = parseInt(parts[0]);
    const m      = parts[1] || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  let result = '';
  if (days) {
    const compact = days.split(',')
      .map(d => dayMap[d.trim()] || d)
      .join('');
    result += compact;
  }
  if (start) result += (result ? ' ' : '') + formatTime(start);
  if (end)   result += ' – ' + formatTime(end);
  return result;
}

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
  const schedule = buildScheduleString(
    data.schedule_days,
    data.schedule_start,
    data.schedule_end
  );

  const [result] = await db.execute(
    `INSERT INTO subjects
       (subject_code, subject_name, units, schedule,
        schedule_days, schedule_start, schedule_end,
        room, instructor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.subject_code,
      data.subject_name,
      data.units,
      schedule,
      data.schedule_days  || null,
      data.schedule_start || null,
      data.schedule_end   || null,
      data.room,
      data.instructor || null
    ]
  );
  return result.insertId;
};

// ─── Update ───────────────────────────────────────────────────
exports.update = async (id, data) => {
  const schedule = buildScheduleString(
    data.schedule_days,
    data.schedule_start,
    data.schedule_end
  );

  await db.execute(
    `UPDATE subjects
     SET subject_code   = ?,
         subject_name   = ?,
         units          = ?,
         schedule       = ?,
         schedule_days  = ?,
         schedule_start = ?,
         schedule_end   = ?,
         room           = ?,
         instructor     = ?
     WHERE id = ?`,
    [
      data.subject_code,
      data.subject_name,
      data.units,
      schedule,
      data.schedule_days  || null,
      data.schedule_start || null,
      data.schedule_end   || null,
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

/**
 * Check for room conflict.
 * A room cannot have two subjects on the same day
 * with overlapping times.
 * excludeId — the current subject's id (used on edit so it
 * doesn't conflict with itself).
 */
exports.checkRoomConflict = async (room, days, start, end, excludeId = null) => {
  // Split days string into array e.g. "Mon,Wed,Fri" -> ['Mon','Wed','Fri']
  const dayList = days.split(',').map(d => d.trim());

  // Build FIND_IN_SET conditions for each day
  // We check if any day in the new subject exists in the stored days
  const dayConditions = dayList
    .map(() => 'FIND_IN_SET(?, REPLACE(schedule_days, ", ", ","))')
    .join(' OR ');

  let sql = `
    SELECT id, subject_code, subject_name, schedule
    FROM subjects
    WHERE room = ?
      AND is_active = 1
      AND schedule_start IS NOT NULL
      AND schedule_end   IS NOT NULL
      AND (${dayConditions})
      AND schedule_start < ?
      AND schedule_end   > ?
  `;

  const params = [room, ...dayList, end, start];

  if (excludeId) {
    sql    += ' AND id != ?';
    params.push(excludeId);
  }

  const [rows] = await db.execute(sql, params);
  return rows; // empty = no conflict
};

/**
 * Check for instructor conflict.
 * An instructor cannot teach two subjects at the same time.
 */
exports.checkInstructorConflict = async (instructor, days, start, end, excludeId = null) => {
  if (!instructor) return []; // no instructor assigned — skip

  const dayList = days.split(',').map(d => d.trim());

  const dayConditions = dayList
    .map(() => 'FIND_IN_SET(?, REPLACE(schedule_days, ", ", ","))')
    .join(' OR ');

  let sql = `
    SELECT id, subject_code, subject_name, schedule
    FROM subjects
    WHERE instructor = ?
      AND is_active  = 1
      AND schedule_start IS NOT NULL
      AND schedule_end   IS NOT NULL
      AND (${dayConditions})
      AND schedule_start < ?
      AND schedule_end   > ?
  `;

  const params = [instructor, ...dayList, end, start];

  if (excludeId) {
    sql    += ' AND id != ?';
    params.push(excludeId);
  }

  const [rows] = await db.execute(sql, params);
  return rows;
};