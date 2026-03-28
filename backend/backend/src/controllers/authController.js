const dns = require('dns').promises;
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const isEmailDomainValid = async (email) => {
  const domain = email.split('@')[1];
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
};

const isPhoneValid = (phone) => {
  const digits = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digits);
};

// @desc    Validate and send OTP — does NOT create user yet
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, email, password, phone, role } = req.body;

    const domainValid = await isEmailDomainValid(email);
    if (!domainValid) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (!isPhoneValid(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({ username, email, password, phone, role: role || 'attendee' });
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
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select('+password');

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

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
