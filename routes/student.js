// routes/student.js
const express = require('express');
const router  = express.Router();
const {
  requireLogin,
  requireStudent,
  requirePasswordChanged
} = require('../middleware/auth');

// All three middleware run on every student route — in order
router.use(requireLogin, requireStudent, requirePasswordChanged);

router.get('/dashboard', (req, res) => {
  res.render('student/dashboard', {
    title: 'Student Dashboard',
    user:  req.session.user
  });
});

module.exports = router;