// routes/auth.js
const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { redirectIfLoggedIn, requireLogin } = require('../middleware/auth');

router.get('/login',  redirectIfLoggedIn, authController.getLogin);
router.post('/login', redirectIfLoggedIn, authController.postLogin);

router.get('/change-password',  requireLogin, authController.getChangePassword);
router.post('/change-password', requireLogin, authController.postChangePassword);

router.get('/forgot-password',  authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

router.get('/reset-password/:token',  authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);

router.get('/logout', authController.logout);

module.exports = router;