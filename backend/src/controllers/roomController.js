// src/controllers/roomController.js
const Room = require('../models/Room');
const Location = require('../models/Location');
const generateRoomCode = require('../utils/generateRoomCode');

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

    console.log(`🔔 User ${req.user.username} joined room ${room.name}`);

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
    .populate('attendees', 'username email role')
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

    console.log(`🔔 User ${req.user.username} left room and locations deleted`);

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
    });

    // Delete all location records for this room
    await Location.deleteMany({ room: req.params.id });

    await room.deleteOne();

    console.log(`🔔 Room ${room.name} deleted along with all location records`);

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
