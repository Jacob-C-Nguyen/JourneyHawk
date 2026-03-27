const Location = require('../models/Location');
const Room = require('../models/Room');

// Functional Req 8: The application should be able to send the user to the map screen
// - Stores GPS lat/lng/accuracy from phone sensor into database
// - Detects geofence violations using Haversine formula (distance from host)
// - Emits real-time Socket.io events so map updates instantly
// - Tracks attendee status (present, away-restroom, away-switching, away-other)
// - Sends notifications to host on status change or geofence exit/enter
// @desc    Update user location
// @route   POST /api/location/update
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { roomId, latitude, longitude, accuracy, status, statusReason } = req.body;

    // Verify user is in the room
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    const isInRoom = room.attendees.some(
      attendee => attendee.toString() === req.user._id.toString()
    ) || room.host.toString() === req.user._id.toString();

    if (!isInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this room',
      });
    }

    // Get previous location to detect status/geofence changes
    const prevLocation = await Location.findOne({
      user: req.user._id,
      room: roomId,
    }).sort({ timestamp: -1 });

    // Check geofence - distance from HOST's current location
    let isOutsideGeofence = false;
    if (room.geofence && room.geofence.radius) {
      // Get host's latest location
      const hostLocation = await Location.findOne({
        user: room.host,
        room: roomId,
      }).sort({ timestamp: -1 });

      if (hostLocation) {
        const distance = calculateDistance(
          latitude,
          longitude,
          hostLocation.latitude,
          hostLocation.longitude
        );
        isOutsideGeofence = distance > (room.geofence.radius || 100);
        
        if (isOutsideGeofence) {
        }
      }
    }

    // Create or update location
    const location = await Location.create({
      user: req.user._id,
      room: roomId,
      latitude,
      longitude,
      accuracy,
      status: status || 'present',
      statusReason: statusReason || '',
      isOutsideGeofence,
    });

    const io = req.app.get('io');
    const Notification = require('../models/Notification');

    // Emit real-time location update to room members
    io.to(`room:${roomId}`).emit('location-update', {
      userId: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      latitude,
      longitude,
      accuracy,
      status: status || 'present',
      statusReason: statusReason || '',
      isOutsideGeofence,
      timestamp: location.timestamp,
    });

    // Notify host of status change (if not host and status changed)
    if (status && prevLocation && status !== prevLocation.status && req.user.role !== 'host') {
      const statusMessages = {
        'present': `${req.user.username} is now present`,
        'away-restroom': `${req.user.username} is away (Restroom)`,
        'away-switching': `${req.user.username} is switching groups`,
        'away-other': `${req.user.username} is away${statusReason ? ': ' + statusReason : ''}`,
      };

      const notification = await Notification.create({
        room: roomId,
        from: req.user._id,
        to: room.host,
        title: 'Attendee Status Changed',
        message: statusMessages[status] || `${req.user.username} changed status`,
        type: 'status-change',
      });

      // Emit notification to host
      io.to(`notification:${room.host.toString()}`).emit('new-notification', {
        notification,
      });
      
    }

    // Notify host of geofence violation
    if (isOutsideGeofence && (!prevLocation || !prevLocation.isOutsideGeofence)) {
      const notification = await Notification.create({
        room: roomId,
        from: req.user._id,
        to: room.host,
        title: 'Geofence Alert',
        message: `${req.user.username} has left the designated area`,
        type: 'geofence-exit',
      });

      io.to(`notification:${room.host.toString()}`).emit('new-notification', {
        notification,
      });
      
    }

    // Notify host when attendee re-enters geofence
    if (!isOutsideGeofence && prevLocation && prevLocation.isOutsideGeofence) {
      const notification = await Notification.create({
        room: roomId,
        from: req.user._id,
        to: room.host,
        title: 'Geofence Alert',
        message: `${req.user.username} has returned to the designated area`,
        type: 'geofence-enter',
      });

      io.to(`notification:${room.host.toString()}`).emit('new-notification', {
        notification,
      });
      
    }


    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Functional Req 9: The application should allow to find an individual attendee
// - Returns latest GPS location for every user in the room
// - Aggregates by user to get most recent position only
// - Includes username, email, phone, role for search bar filtering
// @desc    Get all locations for a room
// @route   GET /api/location/room/:roomId
// @access  Private
exports.getRoomLocations = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify user is in the room
    const room = await Room.findById(roomId).populate('attendees', 'username email role phone');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    const isInRoom = room.attendees.some(
      attendee => attendee._id.toString() === req.user._id.toString()
    ) || room.host.toString() === req.user._id.toString();

    if (!isInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this room',
      });
    }

    // Get latest location for each user in the room
    const locations = await Location.aggregate([
      { $match: { room: room._id } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$user',
          latestLocation: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestLocation' }
      }
    ]);

    // Populate user information
    await Location.populate(locations, { path: 'user', select: 'username email role phone' });

    // Transform data to match frontend expectations
    const transformedLocations = locations.map(loc => ({
      userId: loc.user._id,
      username: loc.user.username,
      email: loc.user.email,
      role: loc.user.role,
      phone: loc.user.phone,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      status: loc.status || 'present',
      statusReason: loc.statusReason || '',
      isOutsideGeofence: loc.isOutsideGeofence || false,
      timestamp: loc.timestamp,
    }));


    res.status(200).json({
      success: true,
      count: transformedLocations.length,
      data: transformedLocations,
    });
  } catch (error) {
    console.error('Error getting room locations:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
