const Notification = require('../models/Notification');
const Room = require('../models/Room');

// Functional Req 6: The application should take users to the notification screen
// - Retrieves all notifications for the logged-in user
// - Sorted by most recent first
// - Populates sender info and room details
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

// Functional Req 7: The application should allow users to send a new notification
// - Sends a notification to a single user
// - Delivers in real-time via Socket.io
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

// Functional Req 7: The application should allow users to send a new notification
// - Host sends notification to ALL attendees in a room at once
// - Creates individual notification records per recipient
// - Each delivered in real-time via Socket.io
// TODO: switch to insertMany for bulk notifications instead of looping creates
exports.sendNotificationToRoom = async (req, res) => {
  try {
    const { roomId, type, title, message } = req.body;

    const room = await Room.findById(roomId).populate('attendees', '_id username email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can send notifications to the room',
      });
    }

    const recipients = room.attendees.filter(
      attendee => attendee._id.toString() !== req.user._id.toString()
    );

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

// Functional Req 6: Notification management - mark as read
// - Verifies notification belongs to the user before updating
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

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

// Functional Req 6: Notification management - delete notification
// - Verifies notification belongs to the user before deleting
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

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
