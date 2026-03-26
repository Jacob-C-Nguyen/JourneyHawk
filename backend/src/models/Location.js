// src/models/Location.js
// Functional Req 8 & 9: Location schema for real-time GPS tracking
// - Stores lat/lng/accuracy from phone GPS sensor
// - status: tracks attendee state (present, away-restroom, away-switching, away-other)
// - isOutsideGeofence: flags when attendee exceeds safety zone radius
// - Auto-deletes records after 7 days (expireAfterSeconds index)
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['present', 'away-restroom', 'away-switching', 'away-other'],
    default: 'present',
  },
  statusReason: {
    type: String,
    default: '',
  },
  isOutsideGeofence: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create index for faster queries
locationSchema.index({ room: 1, timestamp: -1 });

// Auto-delete old location data after 7 days
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Location', locationSchema);
