// src/routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const {
  updateLocation,
  getRoomLocations,
} = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

router.post('/update', protect, updateLocation);
router.get('/room/:roomId', protect, getRoomLocations);

module.exports = router;
