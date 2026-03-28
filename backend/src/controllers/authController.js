const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isPhoneValid = (phone) => {
  const digits = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digits);
};

// Req 3: Creates account with username, email, phone, password, and role
exports.signup = async (req, res) => {
  try {
    const { username, email, password, phone, role } = req.body;

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
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};


// Req 2: Validates credentials and returns JWT token with user role
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    // TODO: add rate limiting here - brute force is an obvious attack vector
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

// Req 1: Returns current user data from stored JWT so app can auto-login on launch
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
