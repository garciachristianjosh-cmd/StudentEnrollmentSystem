// routes/admin.js
const express              = require('express');
const router               = express.Router();
const adminController      = require('../controllers/adminController');
const studentController    = require('../controllers/studentController');
const subjectController    = require('../controllers/subjectController');
const enrollmentController = require('../controllers/enrollmentController');
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
router.get('/subjects',              subjectController.index);
router.get('/subjects/create',       subjectController.getCreate);
router.post('/subjects/create',      subjectController.postCreate);
router.get('/subjects/:id/edit',     subjectController.getEdit);
router.post('/subjects/:id/edit',    subjectController.postEdit);
router.post('/subjects/:id/toggle',  subjectController.toggleStatus);
router.post('/subjects/:id/delete',  subjectController.deleteSubject);

// ─── Enrollment ───────────────────────────────────────────────
router.get('/enrollment',                                    enrollmentController.index);
router.get('/enrollment/:studentId',                         enrollmentController.manage);
router.post('/enrollment/:studentId',                        enrollmentController.enroll);
router.post('/enrollment/:studentId/remove/:enrollmentId',   enrollmentController.remove);

module.exports = router;