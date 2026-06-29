// middleware/auth.js

/**
 * Ensures the request comes from a logged-in user.
 * If not, redirects to the login page.
 */
exports.requireLogin = (req, res, next) => {
  if (req.session && req.session.user) {
    return next(); // logged in — continue to the route
  }
  req.session.returnTo = req.originalUrl; // remember where they were going
  res.redirect('/auth/login');
};

/**
 * Ensures the logged-in user is an admin.
 * Must be used AFTER requireLogin.
 */
exports.requireAdmin = (req, res, next) => {
  if (req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).render('403', { title: 'Access Denied' });
};

/**
 * Ensures the logged-in user is a student.
 * Must be used AFTER requireLogin.
 */
exports.requireStudent = (req, res, next) => {
  if (req.session.user.role === 'student') {
    return next();
  }
  res.status(403).render('403', { title: 'Access Denied' });
};

/**
 * Redirects already-logged-in users away from the login page.
 * No point showing a login form to someone already logged in.
 */
exports.redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    return res.redirect(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  }
  next();
};

/**
 * Forces students with must_change_password = 1
 * to change their password before accessing anything else.
 * Use on all student routes.
 */
exports.requirePasswordChanged = (req, res, next) => {
  if (req.session.user && req.session.user.mustChangePassword) {
    return res.redirect('/auth/change-password');
  }
  next();
};