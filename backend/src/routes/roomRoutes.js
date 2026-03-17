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
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

router.post('/create', protect, authorize('host'), createRoom);
router.post('/join', protect, joinRoom);
router.get('/user/me', protect, getUserRooms);
router.get('/:id', protect, getRoom);
router.put('/:id/leave', protect, leaveRoom);
router.delete('/:id', protect, authorize('host'), deleteRoom);

module.exports = router;
