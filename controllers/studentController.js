// controllers/studentController.js
const bcrypt       = require('bcryptjs');
const studentModel = require('../models/studentModel');
const path         = require('path');

const ITEMS_PER_PAGE = 10;

// Absolute path helper so EJS include() always finds the file
const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'students', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user:       req.session.user,
  activePage: 'students',
  ...extra
});

// ─── GET /admin/students ──────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const page   = Math.max(1, parseInt(req.query.page) || 1);

    const { rows, total } = await studentModel.getAll({
      search, page, limit: ITEMS_PER_PAGE
    });

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:      'Student Management',
      pageView:   view('index'),
      students:   rows,
      search,
      page,
      totalPages,
      total
    }));

  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /admin/students/create ───────────────────────────────
exports.getCreate = (req, res) => {
  res.render('layouts/admin-layout', pageOptions(req, {
    title:    'Add Student',
    pageView: view('create'),
    errors:   [],
    old:      {}
  }));
};

// ─── POST /admin/students/create ─────────────────────────────
exports.postCreate = async (req, res) => {
  const {
    student_id, username, password,
    first_name, middle_name, last_name,
    email, contact_number, course, year_level
  } = req.body;

  const errors = [];

  if (!student_id?.trim())  errors.push('Student ID is required.');
  if (!username?.trim())    errors.push('Username is required.');
  if (!password?.trim())    errors.push('Temporary password is required.');
  if (!first_name?.trim())  errors.push('First name is required.');
  if (!last_name?.trim())   errors.push('Last name is required.');
  if (!email?.trim())       errors.push('Email is required.');
  if (!course?.trim())      errors.push('Course is required.');
  if (!year_level)          errors.push('Year level is required.');

  if (password && password.length < 6)
    errors.push('Temporary password must be at least 6 characters.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email))
    errors.push('Please enter a valid email address.');

  if (errors.length === 0) {
    const [dupStudentId, dupEmail, dupUsername] = await Promise.all([
      studentModel.isDuplicate('student_id', student_id.trim()),
      studentModel.isDuplicate('email',      email.trim()),
      studentModel.isUsernameTaken(username.trim())
    ]);
    if (dupStudentId) errors.push('Student ID is already in use.');
    if (dupEmail)     errors.push('Email address is already in use.');
    if (dupUsername)  errors.push('Username is already taken.');
  }

  if (errors.length > 0) {
    return res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Add Student',
      pageView: view('create'),
      errors,
      old:      req.body
    }));
  }

  try {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    await studentModel.create(
      { username: username.trim(), password: hashedPassword },
      {
        student_id:     student_id.trim(),
        first_name:     first_name.trim(),
        middle_name:    middle_name?.trim(),
        last_name:      last_name.trim(),
        email:          email.trim(),
        contact_number: contact_number?.trim(),
        course:         course.trim(),
        year_level:     parseInt(year_level)
      }
    );

    req.flash('success', `Student ${last_name}, ${first_name} was created successfully.`);
    res.redirect('/admin/students');

  } catch (err) {
    console.error(err);
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Add Student',
      pageView: view('create'),
      errors:   ['Failed to create student. Please try again.'],
      old:      req.body
    }));
  }
};

// ─── GET /admin/students/:id ──────────────────────────────────
exports.show = async (req, res) => {
  try {
    const student = await studentModel.findById(req.params.id);
    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/students');
    }
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    `${student.last_name}, ${student.first_name}`,
      pageView: view('show'),
      student
    }));
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /admin/students/:id/edit ────────────────────────────
exports.getEdit = async (req, res) => {
  try {
    const student = await studentModel.findById(req.params.id);
    if (!student) {
      req.flash('error', 'Student not found.');
      return res.redirect('/admin/students');
    }
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Student',
      pageView: view('edit'),
      student,
      errors:   [],
      old:      student
    }));
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── POST /admin/students/:id/edit ───────────────────────────
exports.postEdit = async (req, res) => {
  const id = req.params.id;
  const {
    first_name, middle_name, last_name,
    email, contact_number, course, year_level
  } = req.body;

  const errors = [];

  if (!first_name?.trim()) errors.push('First name is required.');
  if (!last_name?.trim())  errors.push('Last name is required.');
  if (!email?.trim())      errors.push('Email is required.');
  if (!course?.trim())     errors.push('Course is required.');
  if (!year_level)         errors.push('Year level is required.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email))
    errors.push('Please enter a valid email address.');

  if (errors.length === 0) {
    const dupEmail = await studentModel.isDuplicate('email', email.trim(), id);
    if (dupEmail) errors.push('Email address is already used by another student.');
  }

  if (errors.length > 0) {
    const student = await studentModel.findById(id);
    return res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Student',
      pageView: view('edit'),
      student,
      errors,
      old:      req.body
    }));
  }

  try {
    await studentModel.update(id, {
      first_name:     first_name.trim(),
      middle_name:    middle_name?.trim(),
      last_name:      last_name.trim(),
      email:          email.trim(),
      contact_number: contact_number?.trim(),
      course:         course.trim(),
      year_level:     parseInt(year_level)
    });

    req.flash('success', 'Student information updated successfully.');
    res.redirect(`/admin/students/${id}`);

  } catch (err) {
    console.error(err);
    const student = await studentModel.findById(id);
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Student',
      pageView: view('edit'),
      student,
      errors:   ['Update failed. Please try again.'],
      old:      req.body
    }));
  }
};

// ─── POST /admin/students/:id/delete ─────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    await studentModel.delete(req.params.id);
    req.flash('success', 'Student was deleted successfully.');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete student.');
  }
  res.redirect('/admin/students');
};
