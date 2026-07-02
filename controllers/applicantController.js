const path           = require('path');
const bcrypt         = require('bcryptjs');
const applicantModel = require('../models/applicantModel');
const studentModel   = require('../models/studentModel');
const userModel      = require('../models/userModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'applicants', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user: req.session.user, activePage: 'applicants', ...extra
});

// ─── Public: GET /apply ───────────────────────────────────────
exports.getApplyForm = (req, res) => {
  res.render('public/apply', {
    title:  'Online Admission',
    errors: [],
    old:    {}
  });
};

// ─── Public: POST /apply ──────────────────────────────────────
exports.postApply = async (req, res) => {
  const {
    first_name, middle_name, last_name, birthday,
    gender, email, contact_number, address,
    desired_course, desired_year_level
  } = req.body;

  const errors = [];

  if (!first_name?.trim())       errors.push('First name is required.');
  if (!last_name?.trim())        errors.push('Last name is required.');
  if (!birthday)                 errors.push('Birthday is required.');
  if (!gender)                   errors.push('Gender is required.');
  if (!email?.trim())            errors.push('Email is required.');
  if (!contact_number?.trim())   errors.push('Contact number is required.');
  if (!address?.trim())          errors.push('Address is required.');
  if (!desired_course?.trim())   errors.push('Desired course is required.');
  if (!desired_year_level)       errors.push('Desired year level is required.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email))
    errors.push('Please enter a valid email address.');

  if (errors.length === 0) {
    const dup = await applicantModel.isDuplicateEmail(email.trim().toLowerCase());
    if (dup) errors.push('An application with this email already exists.');
  }

  if (errors.length > 0) {
    return res.render('public/apply', {
      title: 'Online Admission', errors, old: req.body
    });
  }

  try {
    await applicantModel.create({
      first_name:         first_name.trim(),
      middle_name:        middle_name?.trim(),
      last_name:          last_name.trim(),
      birthday,
      gender,
      email:              email.trim().toLowerCase(),
      contact_number:     contact_number.trim(),
      address:            address.trim(),
      desired_course:     desired_course.trim(),
      desired_year_level: parseInt(desired_year_level)
    });
    res.render('public/apply-success', { title: 'Application Submitted' });
  } catch (err) {
    console.error('[applicantController][postApply]:', err);
    res.render('public/apply', {
      title:  'Online Admission',
      errors: ['Something went wrong. Please try again.'],
      old:    req.body
    });
  }
};

// ─── Admin: GET /admin/applicants ─────────────────────────────
exports.index = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const status = req.query.status || '';
    const page   = Math.max(1, parseInt(req.query.page) || 1);

    const { rows, total } = await applicantModel.getAll({
      search, status, page, limit: 10
    });

    const totalPages = Math.ceil(total / 10);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:      'Applicants',
      pageView:   view('index'),
      applicants: rows,
      search,
      status,
      page,
      totalPages,
      total
    }));
  } catch (err) {
    console.error('[applicantController][index]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── Admin: GET /admin/applicants/:id ─────────────────────────
exports.show = async (req, res) => {
  try {
    const applicant = await applicantModel.findById(req.params.id);
    if (!applicant) {
      req.flash('error', 'Applicant not found.');
      return res.redirect('/admin/applicants');
    }
    res.render('layouts/admin-layout', pageOptions(req, {
      title:     `${applicant.last_name}, ${applicant.first_name}`,
      pageView:  view('show'),
      applicant
    }));
  } catch (err) {
    console.error('[applicantController][show]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── Admin: POST /admin/applicants/:id/approve ────────────────
exports.approve = async (req, res) => {
  try {
    const applicant = await applicantModel.findById(req.params.id);
    if (!applicant) {
      req.flash('error', 'Applicant not found.');
      return res.redirect('/admin/applicants');
    }

    if (applicant.status !== 'Pending') {
      req.flash('error', 'Only pending applications can be approved.');
      return res.redirect(`/admin/applicants/${req.params.id}`);
    }

    // ── Generate student ID ──────────────────────────────────
    const year      = new Date().getFullYear();
    const [[{ count }]] = await require('../config/database').execute(
      'SELECT COUNT(*) AS count FROM students'
    );
    const studentId = `${year}-${String(count + 1).padStart(4, '0')}`;

    // ── Generate username ────────────────────────────────────
    const baseUsername = (
      applicant.first_name.charAt(0) + applicant.last_name
    ).toLowerCase().replace(/\s+/g, '');

    // Ensure username is unique
    let username  = baseUsername;
    let counter   = 1;
    while (await studentModel.isUsernameTaken(username)) {
      username = baseUsername + counter++;
    }

    // ── Generate temporary password ──────────────────────────
    const tempPassword = 'Temp@' + Math.random().toString(36).slice(-6).toUpperCase();
    const hashed       = await bcrypt.hash(tempPassword, 10);

    // ── Create user + student in a transaction ───────────────
    await studentModel.create(
      { username, password: hashed },
      {
        student_id:     studentId,
        first_name:     applicant.first_name,
        middle_name:    applicant.middle_name,
        last_name:      applicant.last_name,
        email:          applicant.email,
        contact_number: applicant.contact_number,
        course:         applicant.desired_course,
        year_level:     applicant.desired_year_level
      }
    );

    await applicantModel.updateStatus(
      req.params.id,
      'Approved',
      `Student ID: ${studentId} | Username: ${username} | Temp Password: ${tempPassword}`
    );

    req.flash(
      'success',
      `Application approved. Student ID: ${studentId} | ` +
      `Username: ${username} | Temporary Password: ${tempPassword}`
    );

    res.redirect(`/admin/applicants/${req.params.id}`);

  } catch (err) {
    console.error('[applicantController][approve]:', err);
    req.flash('error', 'Failed to approve application.');
    res.redirect(`/admin/applicants/${req.params.id}`);
  }
};

// ─── Admin: POST /admin/applicants/:id/reject ─────────────────
exports.reject = async (req, res) => {
  try {
    const applicant = await applicantModel.findById(req.params.id);
    if (!applicant) {
      req.flash('error', 'Applicant not found.');
      return res.redirect('/admin/applicants');
    }

    if (applicant.status !== 'Pending') {
      req.flash('error', 'Only pending applications can be rejected.');
      return res.redirect(`/admin/applicants/${req.params.id}`);
    }

    const remarks = req.body.remarks?.trim() || 'Application rejected.';
    await applicantModel.updateStatus(req.params.id, 'Rejected', remarks);

    req.flash('success', 'Application rejected.');
    res.redirect(`/admin/applicants/${req.params.id}`);

  } catch (err) {
    console.error('[applicantController][reject]:', err);
    req.flash('error', 'Failed to reject application.');
    res.redirect(`/admin/applicants/${req.params.id}`);
  }
};