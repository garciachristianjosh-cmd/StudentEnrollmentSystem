// controllers/indexController.js
exports.getHomepage = (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    return res.redirect(
      role === 'admin' ? '/admin/dashboard' : '/student/dashboard'
    );
  }
  res.render('index', { title: 'Student Enrollment System' });
};