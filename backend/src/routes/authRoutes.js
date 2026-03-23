// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, getMe, verifyEmail, resendOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
