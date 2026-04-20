// src/services/socket.js
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

// Derives socket URL from the same API_URL used by api.js (strips /api suffix)
const API_URL = (Constants.expoConfig?.extra?.apiUrl
  ?? 'https://journeyhawk-production.up.railway.app/api'
).replace(/\/api$/, '');

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoomId = null;
  }

  // Connect to socket server
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(API_URL, {
      auth: {
        token,
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      
      // Rejoin room if we were in one
      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoomId = null;
      console.log('Socket disconnected');
    }
  }

  // Join a room channel
  joinRoom(roomId) {
    if (!this.socket || !roomId) return;
    
    this.currentRoomId = roomId;
    this.socket.emit('join-room', roomId);
    console.log(`Joined room channel: ${roomId}`);
  }

  // Leave a room channel
  leaveRoom(roomId) {
    if (!this.socket || !roomId) return;
    
    this.socket.emit('leave-room', roomId);
    this.currentRoomId = null;
    console.log(`Left room channel: ${roomId}`);
  }

  // Join user's notification channel
  joinNotifications(userId) {
    if (!this.socket || !userId) {
      console.warn('Cannot join notifications - socket not connected');
      return;
    }
    
    this.socket.emit('join-notifications', userId);
    console.log(`Joined notification channel: notification:${userId}`);
  }

  // Leave user's notification channel
  leaveNotifications(userId) {
    if (!this.socket || !userId) {
      console.warn('Cannot leave notifications - socket not connected');
      return;
    }
    
    this.socket.emit('leave-notifications', userId);
    console.log(`Left notification channel: notification:${userId}`);
  }

  // Generic emit method (for any custom events)
  emit(event, ...args) {
    if (!this.socket) return;
    this.socket.emit(event, ...args);
  }

  // Listen for events
  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      currentRoomId: this.currentRoomId,
    };
  }
}

// Export singleton instance
export default new SocketService();
