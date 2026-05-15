const express = require('express');
const router = express.Router();
const { login, getMe, sendOTP, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', protect, getMe);

module.exports = router;
