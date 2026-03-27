// Functional Req 10-15, 18, 20: Room schema for group management
// - roomCode: unique 8-char code for attendees to join (Req 13, 15)
// - host: references User who created the room (Req 12)
// - attendees: array of Users in the room (Req 11, 20)
// - geofence: optional safety zone radius around host (Req 8)
// - startDate/endDate: event scheduling with GPS lock until start (Req 18)
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  location: {
    type: String,
    required: [true, 'Please provide a location'],
  },
  notes: {
    type: String,
    default: '',
  },
  geofence: {
    radius: {
      type: Number,
      default: 100, // Default 100 meters
    },
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date'],
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
