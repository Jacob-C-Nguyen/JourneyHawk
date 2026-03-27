// Functional Req 2 & 3: User schema for authentication and account management
// - Password hashed with bcrypt (10 salt rounds) before save
// - Role enum enforces host/attendee separation (Use Case Diagram Fig 3.2)
// - select: false on password prevents it from being returned in queries
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
  },
  role: {
    type: String,
    enum: ['attendee', 'host'],
    default: 'attendee',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Functional Req 3: Password hashed with bcrypt (10 salt rounds) before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Functional Req 2: Compares entered password against stored bcrypt hash during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
