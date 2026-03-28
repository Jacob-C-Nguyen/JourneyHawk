// Req 2/3: Auth routes handle login and registration
// Req 6/7: Notification routes and Socket.io deliver real-time alerts
// Req 8/9: Location routes receive GPS updates and serve room location data
// Req 10-15: Room routes manage room creation, joining, leaving, and attendee management
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'JourneyHawk API is running',
    version: '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Health Check OK',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

// Req 6/7: Socket.io handles real-time notification and room channels
io.on('connection', (socket) => {
  // Req 6: Join personal notification channel to receive alerts
  socket.on('join-notifications', (userId) => {
    const notificationChannel = `notification:${userId}`;
    socket.join(notificationChannel);
  });

  socket.on('leave-notifications', (userId) => {
    const notificationChannel = `notification:${userId}`;
    socket.leave(notificationChannel);
  });

  // Req 8/13: Join room channel to receive location updates and membership events
  socket.on('join-room', (roomId) => {
    socket.join(`room:${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(`room:${roomId}`);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`JourneyHawk API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = { app, io };
