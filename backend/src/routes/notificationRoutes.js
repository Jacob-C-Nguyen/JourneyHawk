// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getNotifications,
  sendNotification,
  sendNotificationToRoom,
  markAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.post('/send', protect, sendNotification);
router.post('/send-to-room', protect, sendNotificationToRoom);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
