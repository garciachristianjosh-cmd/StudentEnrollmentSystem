// routes/student.js
const selfEnrollmentController = require('../controllers/selfEnrollmentController');
const express                  = require('express');
const router                   = express.Router();
const studentDashboardController = require('../controllers/studentDashboardController');
const {
  requireLogin,
  requireStudent,
  requirePasswordChanged
} = require('../middleware/auth');

router.use(requireLogin, requireStudent, requirePasswordChanged);

router.get('/dashboard', studentDashboardController.getDashboard);
router.get('/subjects',  studentDashboardController.getSubjects);
router.get('/schedule',  studentDashboardController.getSchedule);
router.get('/enroll',    selfEnrollmentController.getEnroll);
router.post('/enroll',   selfEnrollmentController.postEnroll);
router.get('/requests',  selfEnrollmentController.getRequests);

module.exports = router;