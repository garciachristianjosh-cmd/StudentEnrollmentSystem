// routes/student.js
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

module.exports = router;