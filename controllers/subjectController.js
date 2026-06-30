// controllers/subjectController.js
const path         = require('path');
const subjectModel = require('../models/subjectModel');

const ITEMS_PER_PAGE = 10;

const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'subjects', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user:       req.session.user,
  activePage: 'subjects',
  ...extra
});

// ─── GET /admin/subjects ──────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const page   = Math.max(1, parseInt(req.query.page) || 1);

    const { rows, total } = await subjectModel.getAll({
      search, page, limit: ITEMS_PER_PAGE
    });

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:      'Subject Management',
      pageView:   view('index'),
      subjects:   rows,
      search,
      page,
      totalPages,
      total
    }));

  } catch (err) {
    console.error('[subjectController][index]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /admin/subjects/create ───────────────────────────────
exports.getCreate = (req, res) => {
  res.render('layouts/admin-layout', pageOptions(req, {
    title:    'Add Subject',
    pageView: view('create'),
    errors:   [],
    old:      {}
  }));
};

// ─── POST /admin/subjects/create ──────────────────────────────
exports.postCreate = async (req, res) => {
  const {
    subject_code, subject_name, units,
    schedule, room, instructor
  } = req.body;

  const errors = [];

  if (!subject_code?.trim()) errors.push('Subject code is required.');
  if (!subject_name?.trim()) errors.push('Subject name is required.');
  if (!units)                errors.push('Units is required.');
  if (!schedule?.trim())     errors.push('Schedule is required.');
  if (!room?.trim())         errors.push('Room is required.');

  if (units && (isNaN(units) || units < 1 || units > 9)) {
    errors.push('Units must be a number between 1 and 9.');
  }

  if (errors.length === 0) {
    const dupCode = await subjectModel.isDuplicate(
      'subject_code', subject_code.trim()
    );
    if (dupCode) errors.push('Subject code is already in use.');
  }

  if (errors.length > 0) {
    return res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Add Subject',
      pageView: view('create'),
      errors,
      old:      req.body
    }));
  }

  try {
    await subjectModel.create({
      subject_code: subject_code.trim().toUpperCase(),
      subject_name: subject_name.trim(),
      units:        parseInt(units),
      schedule:     schedule.trim(),
      room:         room.trim(),
      instructor:   instructor?.trim()
    });

    req.flash('success', `Subject "${subject_name}" was created successfully.`);
    res.redirect('/admin/subjects');

  } catch (err) {
    console.error('[subjectController][postCreate]:', err);
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Add Subject',
      pageView: view('create'),
      errors:   ['Failed to create subject. Please try again.'],
      old:      req.body
    }));
  }
};

// ─── GET /admin/subjects/:id/edit ────────────────────────────
exports.getEdit = async (req, res) => {
  try {
    const subject = await subjectModel.findById(req.params.id);
    if (!subject) {
      req.flash('error', 'Subject not found.');
      return res.redirect('/admin/subjects');
    }

    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Subject',
      pageView: view('edit'),
      subject,
      errors:   [],
      old:      subject
    }));

  } catch (err) {
    console.error('[subjectController][getEdit]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── POST /admin/subjects/:id/edit ───────────────────────────
exports.postEdit = async (req, res) => {
  const id = req.params.id;
  const {
    subject_code, subject_name, units,
    schedule, room, instructor
  } = req.body;

  const errors = [];

  if (!subject_code?.trim()) errors.push('Subject code is required.');
  if (!subject_name?.trim()) errors.push('Subject name is required.');
  if (!units)                errors.push('Units is required.');
  if (!schedule?.trim())     errors.push('Schedule is required.');
  if (!room?.trim())         errors.push('Room is required.');

  if (units && (isNaN(units) || units < 1 || units > 9)) {
    errors.push('Units must be a number between 1 and 9.');
  }

  if (errors.length === 0) {
    const dupCode = await subjectModel.isDuplicate(
      'subject_code', subject_code.trim(), id
    );
    if (dupCode) errors.push('Subject code is already used by another subject.');
  }

  if (errors.length > 0) {
    const subject = await subjectModel.findById(id);
    return res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Subject',
      pageView: view('edit'),
      subject,
      errors,
      old:      req.body
    }));
  }

  try {
    await subjectModel.update(id, {
      subject_code: subject_code.trim().toUpperCase(),
      subject_name: subject_name.trim(),
      units:        parseInt(units),
      schedule:     schedule.trim(),
      room:         room.trim(),
      instructor:   instructor?.trim()
    });

    req.flash('success', 'Subject updated successfully.');
    res.redirect('/admin/subjects');

  } catch (err) {
    console.error('[subjectController][postEdit]:', err);
    const subject = await subjectModel.findById(id);
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Edit Subject',
      pageView: view('edit'),
      subject,
      errors:   ['Update failed. Please try again.'],
      old:      req.body
    }));
  }
};

// ─── POST /admin/subjects/:id/toggle ─────────────────────────
exports.toggleStatus = async (req, res) => {
  try {
    const subject = await subjectModel.findById(req.params.id);
    if (!subject) {
      req.flash('error', 'Subject not found.');
      return res.redirect('/admin/subjects');
    }

    const newStatus = subject.is_active ? 0 : 1;
    await subjectModel.toggleStatus(req.params.id, newStatus);

    req.flash(
      'success',
      `Subject "${subject.subject_name}" has been ${newStatus ? 'activated' : 'deactivated'}.`
    );

  } catch (err) {
    console.error('[subjectController][toggleStatus]:', err);
    req.flash('error', 'Failed to update subject status.');
  }

  res.redirect('/admin/subjects');
};

// ─── POST /admin/subjects/:id/delete ─────────────────────────
exports.deleteSubject = async (req, res) => {
  try {
    await subjectModel.delete(req.params.id);
    req.flash('success', 'Subject was deleted successfully.');
  } catch (err) {
    console.error('[subjectController][deleteSubject]:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      req.flash(
        'error',
        'Cannot delete this subject because students are enrolled in it. Deactivate it instead.'
      );
    } else {
      req.flash('error', 'Failed to delete subject.');
    }
  }
  res.redirect('/admin/subjects');
};