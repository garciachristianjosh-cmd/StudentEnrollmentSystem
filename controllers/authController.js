// controllers/authController.js
const crypto             = require('crypto');
const passwordResetModel = require('../models/passwordResetModel');
const mailer              = require('../utils/mailer');
const bcrypt              = require('bcryptjs');
const userModel           = require('../models/userModel');
const studentModel        = require('../models/studentModel');

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

    req.session.user = {
      id:       user.id,
      username: user.username,
      role:     user.role
    };

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }

    if (user.role === 'student') {
      const student = await studentModel.findByUserId(user.id);

      if (!student) {
        req.session.destroy(() => {});
        return res.render('auth/login', {
          title: 'Login',
          error: 'Student profile not found. Contact your administrator.'
        });
      }

      req.session.user.studentId          = student.student_id;
      req.session.user.firstName          = student.first_name;
      req.session.user.lastName           = student.last_name;
      req.session.user.course             = student.course;
      req.session.user.yearLevel          = student.year_level;
      req.session.user.mustChangePassword = student.must_change_password;

      if (student.must_change_password) {
        return res.redirect('/auth/change-password');
      }

      return res.redirect('/student/dashboard');
    }

  } catch (err) {
    console.error('[authController][postLogin]:', err);
    res.render('auth/login', {
      title: 'Login',
      error: 'Something went wrong. Please try again.'
    });
  }
};

// ─── GET /auth/change-password ────────────────────────────────
exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', {
    title:   'Change Password',
    error:   null,
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
    if (!current_password || !new_password || !confirm_password) {
      return renderPage('All fields are required.');
    }

    if (new_password !== confirm_password) {
      return renderPage('New password and confirmation do not match.');
    }

    if (new_password.length < 8) {
      return renderPage('New password must be at least 8 characters.');
    }

    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(new_password)) {
      return renderPage(
        'Password must contain at least one letter and one number.'
      );
    }

    const [rows] = await require('../config/database').execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    const currentHash = rows[0]?.password;

    const isMatch = await bcrypt.compare(current_password, currentHash);
    if (!isMatch) {
      return renderPage('Current password is incorrect.');
    }

    const isSame = await bcrypt.compare(new_password, currentHash);
    if (isSame) {
      return renderPage(
        'New password must be different from your current password.'
      );
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await userModel.updatePassword(userId, newHash);
    await studentModel.clearPasswordChangeFlag(userId);

    req.session.user.mustChangePassword = 0;

    return res.redirect('/student/dashboard');

  } catch (err) {
    console.error('[authController][postChangePassword]:', err);
    renderPage('Something went wrong. Please try again.');
  }
};

// ─── GET /auth/logout ─────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('[authController][logout]:', err);
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
    console.error('[authController][postForgotPassword]:', err);
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
    console.error('[authController][getResetPassword]:', err);
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
    const record = await passwordResetModel.findValidToken(token);

    if (!record) {
      return renderPage(
        'This reset link is invalid or has expired. Please request a new one.'
      );
    }

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

    const hashed = await bcrypt.hash(new_password, 10);
    await userModel.updatePassword(record.user_id, hashed);
    await studentModel.clearPasswordChangeFlag(record.user_id);
    await passwordResetModel.deleteToken(token);

    renderPage(
      null,
      'Your password has been reset successfully. You can now log in.'
    );

  } catch (err) {
    console.error('[authController][postResetPassword]:', err);
    renderPage('Something went wrong. Please try again.');
  }
};