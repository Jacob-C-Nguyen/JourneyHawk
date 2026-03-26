// src/routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const {
  createRoom,
  joinRoom,
  getRoom,
  getUserRooms,
  leaveRoom,
  deleteRoom,
  removeAttendee,
  inviteByPhone,
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

router.post('/create', protect, authorize('host'), createRoom);
router.post('/join', protect, joinRoom);
router.get('/user/me', protect, getUserRooms);
router.get('/:id', protect, getRoom);
router.put('/:id/leave', protect, leaveRoom);
router.delete('/:id', protect, authorize('host'), deleteRoom);
router.delete('/:id/attendees/:attendeeId', protect, authorize('host'), removeAttendee);
router.post('/:id/invite', protect, authorize('host'), inviteByPhone);

module.exports = router;
