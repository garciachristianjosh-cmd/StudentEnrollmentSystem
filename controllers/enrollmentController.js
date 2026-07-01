// controllers/enrollmentController.js
const path            = require('path');
const studentModel    = require('../models/studentModel');
const enrollmentModel = require('../models/enrollmentModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'enrollment', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user:       req.session.user,
  activePage: 'enrollment',
  ...extra
});

// ─── GET /admin/enrollment ────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = 10;

    const { rows, total } = await studentModel.getAll({
      search, page, limit
    });

    const totalPages = Math.ceil(total / limit);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:      'Enrollment',
      pageView:   view('index'),
      students:   rows,
      search,
      page,
      totalPages,
      total
    }));

  } catch (err) {
    console.error('[enrollmentController][index]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /admin/enrollment/:studentId ─────────────────────────
exports.manage = async (req, res) => {
  try {
    const student = await studentModel.findById(req.params.studentId);
    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/enrollment');
    }

    const [enrolled, available, currentUnits] = await Promise.all([
      enrollmentModel.getByStudent(student.id),
      enrollmentModel.getAvailable(student.id),
      enrollmentModel.getTotalUnits(student.id)
    ]);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:        `Enroll — ${student.last_name}, ${student.first_name}`,
      pageView:     view('manage'),
      student,
      enrolled,
      available,
      currentUnits,
      maxUnits:     enrollmentModel.MAX_UNITS
    }));

  } catch (err) {
    console.error('[enrollmentController][manage]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── POST /admin/enrollment/:studentId ────────────────────────
exports.enroll = async (req, res) => {
  const studentId = req.params.studentId;

  try {
    const student = await studentModel.findById(studentId);
    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/enrollment');
    }

    let subjectIds = req.body.subject_ids;

    if (!subjectIds) {
      req.flash('error', 'Please select at least one subject to enroll.');
      return res.redirect(`/admin/enrollment/${studentId}`);
    }

    if (!Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    subjectIds = subjectIds.map(id => parseInt(id));

    // ── 1. Inactive subject check ─────────────────────────────
    const inactiveSubjects = await enrollmentModel.findInactive(subjectIds);
    if (inactiveSubjects.length > 0) {
      const names = inactiveSubjects
        .map(s => s.subject_code)
        .join(', ');
      req.flash(
        'error',
        `Cannot enroll in inactive subject(s): ${names}. ` +
        `Please ask the administrator to activate them first.`
      );
      return res.redirect(`/admin/enrollment/${studentId}`);
    }

    // ── 2. Duplicate enrollment check ────────────────────────
    const duplicates = await enrollmentModel.findDuplicates(
      student.id,
      subjectIds
    );
    if (duplicates.length > 0) {
      // Remove duplicates from the list instead of rejecting entirely
      subjectIds = subjectIds.filter(id => !duplicates.includes(id));

      if (subjectIds.length === 0) {
        req.flash(
          'error',
          'All selected subjects are already enrolled. ' +
          'No changes were made.'
        );
        return res.redirect(`/admin/enrollment/${studentId}`);
      }

      // Continue with the remaining non-duplicate subjects
      req.flash(
        'success',
        `Note: Some subjects were already enrolled and were skipped.`
      );
    }

    // ── 3. Max units check ────────────────────────────────────
    const [currentUnits, incomingUnits] = await Promise.all([
      enrollmentModel.getTotalUnits(student.id),
      enrollmentModel.getUnitsForSubjects(subjectIds)
    ]);

    const projectedUnits = currentUnits + incomingUnits;

    if (projectedUnits > enrollmentModel.MAX_UNITS) {
      req.flash(
        'error',
        `Cannot enroll: adding these subjects would bring the total to ` +
        `${projectedUnits} units, which exceeds the maximum of ` +
        `${enrollmentModel.MAX_UNITS} units. ` +
        `Current units: ${currentUnits}. ` +
        `Selected subjects: ${incomingUnits} units.`
      );
      return res.redirect(`/admin/enrollment/${studentId}`);
    }

    // ── 4. Schedule conflict check ────────────────────────────
    const conflicts = await enrollmentModel.checkStudentConflicts(
      student.id,
      subjectIds
    );

    if (conflicts.length > 0) {
      const messages = conflicts.map(c =>
        `${c.newSubject} (${c.newSchedule}) conflicts with ` +
        `${c.existingSubject} (${c.existSchedule}) on ${c.sharedDays}.`
      );
      req.flash('error', messages.join(' | '));
      return res.redirect(`/admin/enrollment/${studentId}`);
    }

    // ── 5. All checks passed — enroll ─────────────────────────
    await enrollmentModel.enrollSubjects(student.id, subjectIds);

    const count = subjectIds.length;
    req.flash(
      'success',
      `Successfully enrolled ${student.first_name} ${student.last_name} ` +
      `in ${count} subject${count > 1 ? 's' : ''} ` +
      `(${incomingUnits} unit${incomingUnits !== 1 ? 's' : ''}).`
    );

    res.redirect(`/admin/enrollment/${studentId}`);

  } catch (err) {
    console.error('[enrollmentController][enroll]:', err);
    req.flash('error', 'Enrollment failed. Please try again.');
    res.redirect(`/admin/enrollment/${studentId}`);
  }
};

// ─── POST /admin/enrollment/:studentId/remove/:enrollmentId ───
exports.remove = async (req, res) => {
  const { studentId, enrollmentId } = req.params;

  try {
    const student = await studentModel.findById(studentId);
    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/enrollment');
    }

    await enrollmentModel.remove(enrollmentId, student.id);
    req.flash('success', 'Subject removed from enrollment.');

  } catch (err) {
    console.error('[enrollmentController][remove]:', err);
    req.flash('error', 'Failed to remove subject.');
  }

  res.redirect(`/admin/enrollment/${studentId}`);
};