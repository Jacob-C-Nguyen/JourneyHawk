// src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Connect to database
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handler middleware (must be last)
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join user's personal notification channel
  socket.on('join-notifications', (userId) => {
    const notificationChannel = `notification:${userId}`;
    socket.join(notificationChannel);
    console.log(`🔔 Socket ${socket.id} joined notification channel: ${notificationChannel}`);
  });

  // Leave user's personal notification channel
  socket.on('leave-notifications', (userId) => {
    const notificationChannel = `notification:${userId}`;
    socket.leave(notificationChannel);
    console.log(`🔕 Socket ${socket.id} left notification channel: ${notificationChannel}`);
  });

  // Join room channel
  socket.on('join-room', (roomId) => {
    socket.join(`room:${roomId}`);
    console.log(`📍 Socket ${socket.id} joined room: ${roomId}`);
  });

  // Leave room channel
  socket.on('leave-room', (roomId) => {
    socket.leave(`room:${roomId}`);
    console.log(`🚪 Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║       🚀 JourneyHawk API Server           ║
║                                            ║
║       Server running on port ${PORT}        ║
║       Environment: ${process.env.NODE_ENV || 'development'}              ║
║       Socket.io: ✅ Enabled                ║
║                                            ║
║       API: http://localhost:${PORT}         ║
║       Health: http://localhost:${PORT}/api/health
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`❌ Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = { app, io };
