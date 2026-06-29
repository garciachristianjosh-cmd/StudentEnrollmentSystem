// controllers/authController.js
// Add these requires at the top of authController.js
const crypto             = require('crypto');
const passwordResetModel = require('../models/passwordResetModel');
const mailer             = require('../utils/mailer');
const bcrypt      = require('bcryptjs');
const userModel   = require('../models/userModel');
const studentModel = require('../models/studentModel');

// ─── GET /auth/login ──────────────────────────────────────────
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: null
  });
};

// ─── POST /auth/login ─────────────────────────────────────────
exports.postLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Username and password are required.'
      });
    }

    const user = await userModel.findByUsername(username.trim());

    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password.'
      });
    }

    // Store core identity in session
    req.session.user = {
      id:       user.id,
      username: user.username,
      role:     user.role
    };

    // ── Admin: go straight to dashboard ──────────────────────
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }

    // ── Student: check must_change_password flag ──────────────
    if (user.role === 'student') {
      const student = await studentModel.findByUserId(user.id);

      if (!student) {
        // User row exists but no student profile — data integrity issue
        req.session.destroy(() => {});
        return res.render('auth/login', {
          title: 'Login',
          error: 'Student profile not found. Contact your administrator.'
        });
      }

      // Store student profile details in session for easy access
      req.session.user.studentId    = student.student_id;
      req.session.user.firstName    = student.first_name;
      req.session.user.lastName     = student.last_name;
      req.session.user.course       = student.course;
      req.session.user.yearLevel    = student.year_level;
      req.session.user.mustChangePassword = student.must_change_password;

      if (student.must_change_password) {
        return res.redirect('/auth/change-password');
      }

      return res.redirect('/student/dashboard');
    }

  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      title: 'Login',
      error: 'Something went wrong. Please try again.'
    });
  }
};

// ─── GET /auth/change-password ────────────────────────────────
exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', {
    title:  'Change Password',
    error:  null,
    success: null
  });
};

// ─── POST /auth/change-password ───────────────────────────────
exports.postChangePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.session.user.id;

  const renderPage = (error, success = null) => {
    res.render('auth/change-password', {
      title: 'Change Password',
      error,
      success
    });
  };

  try {
    // ── Validation ────────────────────────────────────────────
    if (!current_password || !new_password || !confirm_password) {
      return renderPage('All fields are required.');
    }

    if (new_password !== confirm_password) {
      return renderPage('New password and confirmation do not match.');
    }

    if (new_password.length < 8) {
      return renderPage('New password must be at least 8 characters.');
    }

    // Enforce at least one letter and one number
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(new_password)) {
      return renderPage(
        'Password must contain at least one letter and one number.'
      );
    }

    // ── Verify current password ───────────────────────────────
    const user = await userModel.findById(userId);
    // findById doesn't return password — fetch full row here
    const [rows] = await require('../config/database').execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    const currentHash = rows[0]?.password;

    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return renderPage('Current password is incorrect.');
    }

    // Prevent reusing the same password
    const isSame = await bcrypt.compare(new_password, currentHash);
    if (isSame) {
      return renderPage(
        'New password must be different from your current password.'
      );
    }

    // ── Hash and save ─────────────────────────────────────────
    const newHash = await bcrypt.hash(new_password, 10);
    await userModel.updatePassword(userId, newHash);

    // Clear the forced-change flag in the students table
    await studentModel.clearPasswordChangeFlag(userId);

    // Update the session so middleware knows the flag is cleared
    req.session.user.mustChangePassword = 0;

    // Redirect to dashboard after success
    return res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Change password error:', err);
    renderPage('Something went wrong. Please try again.');
  }
};

// ─── GET /auth/logout ─────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
};

// ─── GET /auth/forgot-password ────────────────────────────────
exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', {
    title:   'Forgot Password',
    error:   null,
    success: null
  });
};

// ─── POST /auth/forgot-password ───────────────────────────────
exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;

  const renderPage = (error, success = null) =>
    res.render('auth/forgot-password', {
      title: 'Forgot Password', error, success
    });

  if (!email?.trim()) {
    return renderPage('Please enter your email address.');
  }

  try {
    const student = await passwordResetModel.findStudentByEmail(
      email.trim().toLowerCase()
    );

    // Always show the same success message whether the email
    // exists or not — prevents email enumeration attacks
    if (!student || !student.is_active) {
      return renderPage(
        null,
        'If that email is registered, a reset link has been sent.'
      );
    }

    const token = await passwordResetModel.createToken(student.user_id);

    await mailer.sendPasswordReset(
      student.email,
      student.first_name,
      token
    );

    renderPage(
      null,
      'A password reset link has been sent to your email. It expires in 1 hour.'
    );

  } catch (err) {
    console.error('Forgot password error:', err);
    renderPage('Something went wrong. Please try again.');
  }
};

// ─── GET /auth/reset-password/:token ─────────────────────────
exports.getResetPassword = async (req, res) => {
  const { token } = req.params;

  try {
    const record = await passwordResetModel.findValidToken(token);

    if (!record) {
      return res.render('auth/reset-password', {
        title:   'Reset Password',
        token:   null,
        error:   'This reset link is invalid or has expired. Please request a new one.',
        success: null
      });
    }

    res.render('auth/reset-password', {
      title:   'Reset Password',
      token,
      error:   null,
      success: null
    });

  } catch (err) {
    console.error('Reset password GET error:', err);
    res.render('auth/reset-password', {
      title:   'Reset Password',
      token:   null,
      error:   'Something went wrong. Please try again.',
      success: null
    });
  }
};

// ─── POST /auth/reset-password/:token ────────────────────────
exports.postResetPassword = async (req, res) => {
  const { token }                          = req.params;
  const { new_password, confirm_password } = req.body;

  const renderPage = (error, success = null) =>
    res.render('auth/reset-password', {
      title: 'Reset Password', token, error, success
    });

  try {
    // Re-validate the token on POST — the link may have
    // expired between the GET and POST requests
    const record = await passwordResetModel.findValidToken(token);

    if (!record) {
      return renderPage(
        'This reset link is invalid or has expired. Please request a new one.'
      );
    }

    // Validate password
    if (!new_password || !confirm_password) {
      return renderPage('All fields are required.');
    }

    if (new_password !== confirm_password) {
      return renderPage('Passwords do not match.');
    }

    if (new_password.length < 8) {
      return renderPage('Password must be at least 8 characters.');
    }

    const pattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!pattern.test(new_password)) {
      return renderPage(
        'Password must contain at least one letter and one number.'
      );
    }

    // Hash and save the new password
    const hashed = await bcrypt.hash(new_password, 10);
    await userModel.updatePassword(record.user_id, hashed);

    // Also clear the must_change_password flag if it was set
    await studentModel.clearPasswordChangeFlag(record.user_id);

    // Delete the used token immediately
    await passwordResetModel.deleteToken(token);

    renderPage(
      null,
      'Your password has been reset successfully. You can now log in.'
    );

  } catch (err) {
    console.error('Reset password POST error:', err);
    renderPage('Something went wrong. Please try again.');
  }
};