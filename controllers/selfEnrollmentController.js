const path            = require('path');
const studentModel    = require('../models/studentModel');
const enrollmentModel = require('../models/enrollmentModel');
const semesterModel   = require('../models/semesterModel');
const subjectModel    = require('../models/subjectModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'student', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user: req.session.user,
  activePage: extra.activePage || 'enroll',
  ...extra
});

// ─── GET /student/enroll ──────────────────────────────────────
exports.getEnroll = async (req, res) => {
  try {
    const student   = await studentModel.findByUserId(req.session.user.id);
    const semester  = await semesterModel.getActive();
    const available = await enrollmentModel.getAvailable(student.id);
    const currentUnits = await enrollmentModel.getTotalUnits(student.id);

    res.render('layouts/student-layout', pageOptions(req, {
      title:        'Enroll in Subjects',
      activePage:   'enroll',
      pageView:     view('enroll'),
      student,
      semester,
      available,
      currentUnits,
      maxUnits:     enrollmentModel.MAX_UNITS
    }));
  } catch (err) {
    console.error('[selfEnrollmentController][getEnroll]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── POST /student/enroll ─────────────────────────────────────
exports.postEnroll = async (req, res) => {
  try {
    const student  = await studentModel.findByUserId(req.session.user.id);
    const semester = await semesterModel.getActive();

    let subjectIds = req.body.subject_ids;

    if (!subjectIds) {
      req.flash('error', 'Please select at least one subject.');
      return res.redirect('/student/enroll');
    }

    if (!Array.isArray(subjectIds)) subjectIds = [subjectIds];
    subjectIds = subjectIds.map(id => parseInt(id));

    // Inactive check
    const inactive = await enrollmentModel.findInactive(subjectIds);
    if (inactive.length > 0) {
      req.flash('error', `Cannot enroll in inactive subject(s): ${inactive.map(s => s.subject_code).join(', ')}.`);
      return res.redirect('/student/enroll');
    }

    // Duplicate check
    let duplicates = await enrollmentModel.findDuplicates(student.id, subjectIds);
    subjectIds = subjectIds.filter(id => !duplicates.includes(id));

    if (subjectIds.length === 0) {
      req.flash('error', 'All selected subjects are already in your enrollment.');
      return res.redirect('/student/enroll');
    }

    // Units check
    const [currentUnits, incomingUnits] = await Promise.all([
      enrollmentModel.getTotalUnits(student.id),
      enrollmentModel.getUnitsForSubjects(subjectIds)
    ]);

    if (currentUnits + incomingUnits > enrollmentModel.MAX_UNITS) {
      req.flash('error',
        `Adding these subjects would exceed the ${enrollmentModel.MAX_UNITS} unit maximum. ` +
        `Current: ${currentUnits}, Selected: ${incomingUnits}.`
      );
      return res.redirect('/student/enroll');
    }

    // Conflict check
    const conflicts = await enrollmentModel.checkStudentConflicts(student.id, subjectIds);
    if (conflicts.length > 0) {
      const messages = conflicts.map(c =>
        `${c.newSubject} conflicts with ${c.existingSubject} on ${c.sharedDays}.`
      );
      req.flash('error', messages.join(' | '));
      return res.redirect('/student/enroll');
    }

    // Insert as pending with semester
    const semesterId = semester?.id || null;
    await enrollmentModel.enrollSubjectsPending(student.id, subjectIds, semesterId);

    req.flash('success', `${subjectIds.length} subject(s) submitted for enrollment approval.`);
    res.redirect('/student/requests');

  } catch (err) {
    console.error('[selfEnrollmentController][postEnroll]:', err);
    req.flash('error', 'Enrollment request failed. Please try again.');
    res.redirect('/student/enroll');
  }
};

// ─── GET /student/requests ────────────────────────────────────
exports.getRequests = async (req, res) => {
  try {
    const student  = await studentModel.findByUserId(req.session.user.id);
    const requests = await enrollmentModel.getRequestsByStudent(student.id);

    res.render('layouts/student-layout', pageOptions(req, {
      title:      'My Enrollment Requests',
      activePage: 'requests',
      pageView:   view('requests'),
      student,
      requests
    }));
  } catch (err) {
    console.error('[selfEnrollmentController][getRequests]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};