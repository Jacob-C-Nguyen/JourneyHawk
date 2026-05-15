const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: String,
  otp: String,
  expiresAt: { type: Date, index: { expires: 0 } },
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
