// Req 8: Delivers real-time location-update events so the map refreshes instantly
// Req 6/7: Delivers new-notification events for in-app alert popups
// Req 13/14: Broadcasts user-joined and user-left events for room membership changes
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const API_URL = (Constants.expoConfig?.extra?.apiUrl
  ?? 'https://journeyhawk-production.up.railway.app/api'
).replace(/\/api$/, '');

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoomId = null;
    this.currentNotificationUserId = null;
  }

  connect(token) {
    if (this.socket?.connected) {
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
      this.isConnected = true;
      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
      if (this.currentNotificationUserId) {
        this.joinNotifications(this.currentNotificationUserId);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoomId = null;
      this.currentNotificationUserId = null;
    }
  }

  // Req 8: Join room channel to receive location updates for that room
  joinRoom(roomId) {
    this.currentRoomId = roomId; // Always save so the connect handler can re-join after cold start
    if (!this.socket || !roomId) return;
    this.socket.emit('join-room', roomId);
  }

  leaveRoom(roomId) {
    if (!this.socket || !roomId) return;
    this.socket.emit('leave-room', roomId);
    this.currentRoomId = null;
  }

  // Req 6/7: Join personal notification channel to receive alerts
  joinNotifications(userId) {
    this.currentNotificationUserId = userId; // Always save so the connect handler can re-join after reconnect
    if (!this.socket || !userId) return;
    this.socket.emit('join-notifications', userId);
  }

  leaveNotifications(userId) {
    if (!this.socket || !userId) return;
    this.socket.emit('leave-notifications', userId);
  }

  emit(event, ...args) {
    if (!this.socket) return;
    this.socket.emit(event, ...args);
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      currentRoomId: this.currentRoomId,
    };
  }
}

export default new SocketService();
