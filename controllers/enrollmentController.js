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

    const [enrolled, available] = await Promise.all([
      enrollmentModel.getByStudent(student.id),
      enrollmentModel.getAvailable(student.id)
    ]);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:    `Enroll — ${student.last_name}, ${student.first_name}`,
      pageView: view('manage'),
      student,
      enrolled,
      available
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

    await enrollmentModel.enrollSubjects(student.id, subjectIds);

    const count = subjectIds.length;
    req.flash(
      'success',
      `Successfully enrolled ${student.first_name} ${student.last_name} ` +
      `in ${count} subject${count > 1 ? 's' : ''}.`
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