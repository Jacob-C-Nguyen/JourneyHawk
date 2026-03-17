// src/utils/generateRoomCode.js
const crypto = require('crypto');

const generateRoomCode = () => {
  // Generate 8-character random code (e.g., "A3F9B2C1")
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = generateRoomCode;
