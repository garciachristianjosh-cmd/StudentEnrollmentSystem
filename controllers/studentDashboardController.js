// controllers/studentDashboardController.js
const path            = require('path');
const studentModel    = require('../models/studentModel');
const enrollmentModel = require('../models/enrollmentModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'student', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user:       req.session.user,
  activePage: extra.activePage || 'dashboard',
  ...extra
});

// ─── GET /student/dashboard ───────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const student  = await studentModel.findByUserId(req.session.user.id);
    const enrolled = await enrollmentModel.getStudentSchedule(student.id);

    const totalUnits = enrolled.reduce((sum, e) => sum + e.units, 0);

    res.render('layouts/student-layout', pageOptions(req, {
      title:      'Dashboard',
      activePage: 'dashboard',
      pageView:   view('dashboard'),
      student,
      enrolled,
      totalUnits
    }));

  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /student/subjects ────────────────────────────────────
exports.getSubjects = async (req, res) => {
  try {
    const student  = await studentModel.findByUserId(req.session.user.id);
    const enrolled = await enrollmentModel.getStudentSchedule(student.id);

    const totalUnits = enrolled.reduce((sum, e) => sum + e.units, 0);

    res.render('layouts/student-layout', pageOptions(req, {
      title:      'My Subjects',
      activePage: 'subjects',
      pageView:   view('subjects'),
      student,
      enrolled,
      totalUnits
    }));

  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /student/schedule ────────────────────────────────────
exports.getSchedule = async (req, res) => {
  try {
    const student  = await studentModel.findByUserId(req.session.user.id);
    const enrolled = await enrollmentModel.getStudentSchedule(student.id);

    res.render('layouts/student-layout', pageOptions(req, {
      title:      'Class Schedule',
      activePage: 'schedule',
      pageView:   view('schedule'),
      student,
      enrolled
    }));

  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};