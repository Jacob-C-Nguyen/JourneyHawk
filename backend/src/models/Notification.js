// Functional Req 6 & 7: Notification schema for alerts and messaging
// - Types: message, alert, location_alert, room_update
// - from/to: references sending and receiving Users
// - room: associates notification with specific room
// - read: tracks whether notification has been viewed
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['alert', 'message', 'room_update', 'location_alert', 'status-change', 'geofence-exit', 'geofence-enter'],
    default: 'message',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
