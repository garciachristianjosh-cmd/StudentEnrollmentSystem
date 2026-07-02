// routes/admin.js
const applicantController  = require('../controllers/applicantController');
const semesterController   = require('../controllers/semesterController');
const express              = require('express');
const router               = express.Router();
const adminController      = require('../controllers/adminController');
const studentController    = require('../controllers/studentController');
const subjectController    = require('../controllers/subjectController');
const enrollmentController = require('../controllers/enrollmentController');
const reportController     = require('../controllers/reportController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin, requireAdmin);

// ─── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ─── Student Management ───────────────────────────────────────
router.get('/students',             studentController.index);
router.get('/students/create',      studentController.getCreate);
router.post('/students/create',     studentController.postCreate);
router.get('/students/:id',         studentController.show);
router.get('/students/:id/edit',    studentController.getEdit);
router.post('/students/:id/edit',   studentController.postEdit);
router.post('/students/:id/delete', studentController.deleteStudent);

// ─── Subject Management ───────────────────────────────────────
router.get('/subjects',             subjectController.index);
router.get('/subjects/create',      subjectController.getCreate);
router.post('/subjects/create',     subjectController.postCreate);
router.get('/subjects/:id/edit',    subjectController.getEdit);
router.post('/subjects/:id/edit',   subjectController.postEdit);
router.post('/subjects/:id/toggle', subjectController.toggleStatus);
router.post('/subjects/:id/delete', subjectController.deleteSubject);

// ─── Enrollment Requests ──────────────────────────────────────
router.get('/enrollment/requests',                enrollmentController.pendingRequests);
router.post('/enrollment/requests/:id/approve',   enrollmentController.approveRequest);
router.post('/enrollment/requests/:id/reject',    enrollmentController.rejectRequest);

// ─── Enrollment ───────────────────────────────────────────────
router.get('/enrollment',
  enrollmentController.index);
router.get('/enrollment/:studentId',
  enrollmentController.manage);
router.post('/enrollment/:studentId',
  enrollmentController.enroll);
router.post('/enrollment/:studentId/remove/:enrollmentId',
  enrollmentController.remove);

// ─── Reports ─────────────────────────────────────────────────
router.get('/reports',        reportController.index);
router.get('/reports/export', reportController.exportCsv);

// ─── Applicants ───────────────────────────────────────────────
router.get('/applicants',              applicantController.index);
router.get('/applicants/:id',          applicantController.show);
router.post('/applicants/:id/approve', applicantController.approve);
router.post('/applicants/:id/reject',  applicantController.reject);

// ─── Semesters ────────────────────────────────────────────────
router.get('/semesters',           semesterController.index);
router.post('/semesters/create',   semesterController.postCreate);
router.post('/semesters/:id/activate', semesterController.setActive);
router.post('/semesters/:id/delete',   semesterController.deleteSemester);
router.post('/semesters/:id/deactivate', semesterController.deactivate);

module.exports = router;