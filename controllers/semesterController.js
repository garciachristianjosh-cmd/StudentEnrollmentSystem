const path           = require('path');
const semesterModel  = require('../models/semesterModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'semesters', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user: req.session.user, activePage: 'semesters', ...extra
});

exports.index = async (req, res) => {
  try {
    const semesters = await semesterModel.getAll();
    res.render('layouts/admin-layout', pageOptions(req, {
      title:    'Semesters',
      pageView: view('index'),
      semesters
    }));
  } catch (err) {
    console.error('[semesterController][index]:', err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

exports.postCreate = async (req, res) => {
  const { school_year, semester } = req.body;
  if (!school_year?.trim() || !semester) {
    req.flash('error', 'School year and semester are required.');
    return res.redirect('/admin/semesters');
  }
  try {
    await semesterModel.create({
      school_year: school_year.trim(),
      semester
    });
    req.flash('success', `Semester ${semester} ${school_year} created.`);
  } catch (err) {
    console.error('[semesterController][postCreate]:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'That semester already exists.');
    } else {
      req.flash('error', 'Failed to create semester.');
    }
  }
  res.redirect('/admin/semesters');
};

exports.setActive = async (req, res) => {
  try {
    await semesterModel.setActive(req.params.id);
    req.flash('success', 'Active semester updated.');
  } catch (err) {
    console.error('[semesterController][setActive]:', err);
    req.flash('error', 'Failed to set active semester.');
  }
  res.redirect('/admin/semesters');
};

exports.deleteSemester = async (req, res) => {
  try {
    await semesterModel.delete(req.params.id);
    req.flash('success', 'Semester deleted.');
  } catch (err) {
    console.error('[semesterController][deleteSemester]:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      req.flash('error', 'Cannot delete a semester with enrollment records.');
    } else {
      req.flash('error', 'Failed to delete semester.');
    }
  }
  res.redirect('/admin/semesters');
};

exports.deactivate = async (req, res) => {
  try {
    await semesterModel.deactivate(req.params.id);
    req.flash('success', 'Semester deactivated.');
  } catch (err) {
    console.error('[semesterController][deactivate]:', err);
    req.flash('error', 'Failed to deactivate semester.');
  }
  res.redirect('/admin/semesters');
};