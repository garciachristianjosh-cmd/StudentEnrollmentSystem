// routes/auth.js
const express      = require('express');
const router       = express.Router();
const authController = require('../controllers/authController');
const { redirectIfLoggedIn, requireLogin } = require('../middleware/auth');

router.get('/login',  redirectIfLoggedIn, authController.getLogin);
router.post('/login', redirectIfLoggedIn, authController.postLogin);

// Change password requires being logged in (student just authenticated)
router.get('/change-password',  requireLogin, authController.getChangePassword);
router.post('/change-password', requireLogin, authController.postChangePassword);

router.get('/logout', authController.logout);

module.exports = router;