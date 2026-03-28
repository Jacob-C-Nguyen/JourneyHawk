const Room = require('../models/Room');
const Location = require('../models/Location');
const generateRoomCode = require('../utils/generateRoomCode');

// Functional Req 15: The application should allow the user to invite attendees to their room
// - Generates unique 8-character room code for attendees to join
// Functional Req 18: The application should allow for the user to make an event
// - Creates room with name, location, date/time, notes, and optional geofence
// @desc    Create a new room
// @route   POST /api/rooms/create
// @access  Private (Host only)
exports.createRoom = async (req, res) => {
  try {
    const { name, location, notes, startDate, endDate } = req.body;

    // Generate unique room code
    let roomCode = generateRoomCode();
    let codeExists = await Room.findOne({ roomCode });

    // Keep generating until we get a unique code
    while (codeExists) {
      roomCode = generateRoomCode();
      codeExists = await Room.findOne({ roomCode });
    }

    // Create room
    const room = await Room.create({
      roomCode,
      name,
      host: req.user._id,
      attendees: [req.user._id], // Host is automatically added
      location,
      notes,
      startDate,
      endDate,
    });

    // Populate host information
    await room.populate('host', 'username email');

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Functional Req 13: The application should be able to verify registration from an attendee
// - Validates room code and adds user to room attendee list
// Functional Req 14: The application should allow hosts to join an existing room
// - Hosts can join another host's room as chaperone via room code
// @desc    Join a room with code
// @route   POST /api/rooms/join
// @access  Private
exports.joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found with this code',
      });
    }

    // Check if user is already in the room
    if (room.attendees.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this room',
      });
    }

    // Add user to room
    room.attendees.push(req.user._id);
    await room.save();

    // Populate attendees
    await room.populate('attendees', 'username email role');
    await room.populate('host', 'username email');

    // Emit socket event to room members
    const io = req.app.get('io');
    io.to(`room:${room._id}`).emit('user-joined', {
      roomId: room._id,
      user: {
        _id: req.user._id.toString(),
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      },
      room,
    });


    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Functional Req 11: The application should allow the user to view an attendee's basic information
// - Returns room with populated attendee details (username, email, phone, role)
// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'username email phone')
      .populate('attendees', 'username email phone role');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if user is in the room
    const isInRoom = room.attendees.some(
      attendee => attendee._id.toString() === req.user._id.toString()
    ) || room.host._id.toString() === req.user._id.toString();

    if (!isInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this room',
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Functional Req 10: The application should allow user to switch over to the room screen
// - Returns all rooms the user is in (as host or attendee)
// @desc    Get all rooms for a user
// @route   GET /api/rooms/user/me
// @access  Private
exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { host: req.user._id },
        { attendees: req.user._id }
      ],
      isActive: true
    })
    .populate('host', 'username email')
    .populate('attendees', 'username email phone role')
    .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Functional Req 12: The application should allow the user to be able to remove any registered attendee
// - Attendee removes themselves from the room
// - Deletes all location records for the user in this room
// - Emits socket event so other users see them removed in real-time
// @desc    Leave a room
// @route   PUT /api/rooms/:id/leave
// @access  Private
exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if user is the host
    if (room.host.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Host cannot leave the room. Delete the room instead.',
      });
    }

    // Remove user from attendees
    room.attendees = room.attendees.filter(
      attendee => attendee.toString() !== req.user._id.toString()
    );

    await room.save();

    // Delete all location records for this user in this room
    await Location.deleteMany({
      user: req.user._id,
      room: req.params.id
    });

    // Emit socket event to room members
    const io = req.app.get('io');
    io.to(`room:${room._id}`).emit('user-left', {
      roomId: room._id,
      userId: req.user._id.toString(),
      username: req.user.username,
    });


    res.status(200).json({
      success: true,
      message: 'Successfully left the room',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Functional Req 12: The application should allow the host to remove individual attendees
// @desc    Remove an attendee from a room
// @route   DELETE /api/rooms/:id/attendees/:attendeeId
// @access  Private (Host only)
exports.removeAttendee = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can remove attendees' });
    }

    const attendeeId = req.params.attendeeId;
    if (room.host.toString() === attendeeId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the host' });
    }

    const wasInRoom = room.attendees.some(a => a.toString() === attendeeId);
    if (!wasInRoom) {
      return res.status(404).json({ success: false, message: 'Attendee not in this room' });
    }

    room.attendees = room.attendees.filter(a => a.toString() !== attendeeId);
    await room.save();

    await Location.deleteMany({ user: attendeeId, room: req.params.id });

    const io = req.app.get('io');
    io.to(`room:${room._id}`).emit('user-left', {
      roomId: room._id,
      userId: attendeeId,
      username: 'attendee',
      removedByHost: true,
    });

    res.status(200).json({ success: true, message: 'Attendee removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Functional Req 15: Invite attendee by phone number
// @desc    Find user by phone and add them to the room
// @route   POST /api/rooms/:id/invite
// @access  Private (Host only)
exports.inviteByPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the host can invite attendees' });
    }

    const User = require('../models/User');
    const invitee = await User.findOne({ phone });
    if (!invitee) {
      return res.status(404).json({ success: false, message: 'No user found with that phone number' });
    }

    if (room.attendees.some(a => a.toString() === invitee._id.toString())) {
      return res.status(400).json({ success: false, message: `${invitee.username} is already in this room` });
    }

    room.attendees.push(invitee._id);
    await room.save();
    await room.populate('attendees', 'username email phone role');
    await room.populate('host', 'username email');

    const io = req.app.get('io');
    io.to(`room:${room._id}`).emit('user-joined', {
      roomId: room._id,
      user: { _id: invitee._id.toString(), username: invitee.username, email: invitee.email, role: invitee.role },
      room,
    });

    res.status(200).json({ success: true, data: { username: invitee.username, email: invitee.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Functional Req 12: The application should allow the user to be able to remove any registered attendee
// - Host deletes the entire room, removing all attendees
// - Deletes all location records for the room
// - Emits socket event to notify all attendees of room deletion
// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private (Host only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if user is the host
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can delete this room',
      });
    }

    // Emit socket event BEFORE deleting room
    const io = req.app.get('io');
    io.to(`room:${room._id}`).emit('room-deleted', {
      roomId: room._id,
      roomName: room.name,
      deletedByUserId: req.user._id.toString(),
    });

    // Delete all location records for this room
    await Location.deleteMany({ room: req.params.id });

    await room.deleteOne();


    res.status(200).json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
