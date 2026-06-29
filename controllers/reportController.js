// controllers/reportController.js
const { escapeCsv } = require('../utils/sanitize');
const path        = require('path');
const reportModel = require('../models/reportModel');

const view = (name) =>
  path.join(__dirname, '..', 'views', 'admin', 'reports', name + '.ejs');

const pageOptions = (req, extra = {}) => ({
  user:       req.session.user,
  activePage: 'reports',
  ...extra
});

// ─── GET /admin/reports ───────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const filters = {
      search:     (req.query.search     || '').trim(),
      course:     (req.query.course     || '').trim(),
      year_level: (req.query.year_level || '').trim(),
      status:     (req.query.status     || '').trim()
    };
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 15;

    const [{ rows, total }, summary] = await Promise.all([
      reportModel.getEnrollmentReport({ ...filters, page, limit }),
      reportModel.getReportSummary()
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('layouts/admin-layout', pageOptions(req, {
      title:   'Reports',
      pageView: view('index'),
      rows,
      total,
      summary,
      filters,
      page,
      totalPages,
      limit
    }));

  } catch (err) {
    console.error(err);
    res.status(500).render('500', { title: 'Error', error: err });
  }
};

// ─── GET /admin/reports/export ────────────────────────────────
exports.exportCsv = async (req, res) => {
  try {
    const filters = {
      search:     (req.query.search     || '').trim(),
      course:     (req.query.course     || '').trim(),
      year_level: (req.query.year_level || '').trim(),
      status:     (req.query.status     || '').trim()
    };

    const rows = await reportModel.getAllForExport(filters);

    // Build CSV string
    const headers = [
      'Student ID', 'Last Name', 'First Name', 'Course',
      'Year Level', 'Email', 'Subject Code', 'Subject Name',
      'Units', 'Schedule', 'Room', 'Instructor',
      'Status', 'Enrolled At'
    ];

    const csvRows = rows.map(r => [
      escapeCsv(r.student_id),
      escapeCsv(r.last_name),
      escapeCsv(r.first_name),
      escapeCsv(r.course),
      escapeCsv(r.year_level),
      escapeCsv(r.email),
      escapeCsv(r.subject_code),
      escapeCsv(r.subject_name),
      escapeCsv(r.units),
      `"${escapeCsv(r.schedule)}"`,
      escapeCsv(r.room),
      escapeCsv(r.instructor || ''),
      escapeCsv(r.status),
      new Date(r.enrolled_at).toLocaleDateString('en-US')
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');

    // Tell the browser to download it as a file
    const filename = `enrollment-report-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition', `attachment; filename="${filename}"`
    );
    res.send(csv);

  } catch (err) {
    console.error(err);
    req.flash('error', 'Export failed. Please try again.');
    res.redirect('/admin/reports');
  }
};