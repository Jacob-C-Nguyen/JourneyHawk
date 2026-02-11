// src/controllers/notificationController.js
const Notification = require('../models/Notification');
const Room = require('../models/Room');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ to: req.user._id })
      .populate('from', 'username email')
      .populate('room', 'name roomCode')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send notification to single user
// @route   POST /api/notifications/send
// @access  Private
exports.sendNotification = async (req, res) => {
  try {
    const { toUserId, type, title, message, roomId } = req.body;

    const notification = await Notification.create({
      from: req.user._id,
      to: toUserId,
      type,
      title,
      message,
      room: roomId,
    });

    await notification.populate('from', 'username email');

    // Emit real-time notification via Socket.io
    const io = req.app.get('io');
    io.to(`notification:${toUserId}`).emit('new-notification', {
      notification: {
        _id: notification._id,
        from: notification.from,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        room: notification.room,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    });

    console.log(`🔔 Notification sent to user: ${toUserId}`);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send notification to all room attendees
// @route   POST /api/notifications/send-to-room
// @access  Private (Host only)
exports.sendNotificationToRoom = async (req, res) => {
  try {
    const { roomId, type, title, message } = req.body;

    // Get room and verify user is host
    const room = await Room.findById(roomId).populate('attendees', '_id username email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Verify user is host
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can send notifications to the room',
      });
    }

    // Get recipients (exclude sender)
    const recipients = room.attendees.filter(
      attendee => attendee._id.toString() !== req.user._id.toString()
    );

    // Create notifications for all attendees
    const notifications = [];
    const io = req.app.get('io');

    for (const attendee of recipients) {
      const notification = await Notification.create({
        from: req.user._id,
        to: attendee._id,
        type,
        title,
        message,
        room: roomId,
      });

      await notification.populate('from', 'username email');
      notifications.push(notification);

      // Emit real-time notification via Socket.io (for in-app)
      io.to(`notification:${attendee._id}`).emit('new-notification', {
        notification: {
          _id: notification._id,
          from: notification.from,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          room: notification.room,
          read: notification.read,
          createdAt: notification.createdAt,
        },
      });
    }

    console.log(`🔔 Notification sent to ${notifications.length} attendees in room ${room.name}`);

    res.status(201).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error('Error sending notification to room:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Verify notification belongs to user
    if (notification.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification',
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Verify notification belongs to user
    if (notification.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
