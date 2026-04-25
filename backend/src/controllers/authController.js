const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const generateToken = require('../utils/generateToken');
const { sendOTPEmail } = require('../utils/emailService');

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isPhoneValid = (phone) => {
  const digits = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digits);
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { username, email, phone, password, role } = req.body;

    if (!isEmailValid(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (!isPhoneValid(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await PendingUser.findOneAndUpdate(
      { email },
      {
        username,
        email,
        phone,
        password,
        role: role || 'attendee',
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    await sendOTPEmail(email, otp);

    res.status(200).json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const pending = await PendingUser.findOne({ email });

    if (!pending) {
      return res.status(400).json({ success: false, message: 'No pending verification found. Please sign up again.' });
    }

    if (new Date() > pending.expiresAt) {
      await PendingUser.deleteOne({ email });
      return res.status(400).json({ success: false, message: 'Code expired. Please sign up again.' });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
    }

    const user = await User.create({
      username: pending.username,
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      role: pending.role,
    });

    await PendingUser.deleteOne({ email });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
