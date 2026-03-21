// src/services/api.js
// Core API service - all backend communication flows through here
// - Axios instance with JWT token auto-injection via interceptor
// - Auth API: signup (Req 3), login (Req 2)
// - Room API: create (Req 15, 18), join (Req 13, 14), leave (Req 12), getUserRooms (Req 10)
// - Location API: update (Req 8), getRoomLocations (Req 9)
// - Notification API: getAll (Req 6), sendToRoom (Req 7), markAsRead, delete
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Backend API URL
// DEVELOPMENT: Set to false to use Railway, true to use local backend
const USE_LOCAL_BACKEND = true;  // Change to true for local testing

const API_URL = USE_LOCAL_BACKEND
  ? 'http://192.168.1.7:3000/api'  // Local development
  : 'https://journeyhawk-production.up.railway.app/api';  // Railway production

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // No response received
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Room API calls
export const roomAPI = {
  create: async (roomData) => {
    const response = await api.post('/rooms/create', roomData);
    return response.data;
  },

  join: async (roomCode) => {
    const response = await api.post('/rooms/join', { roomCode });
    return response.data;
  },

  getUserRooms: async () => {
    const response = await api.get('/rooms/user/me');
    return response.data;
  },

  getRoom: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },

  leave: async (roomId) => {
    const response = await api.put(`/rooms/${roomId}/leave`);
    return response.data;
  },

  delete: async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },
};

// Location API calls
export const locationAPI = {
  update: async (locationData) => {
    const response = await api.post('/location/update', locationData);
    return response.data;
  },

  getRoomLocations: async (roomId) => {
    const response = await api.get(`/location/room/${roomId}`);
    return response.data;
  },
};

// Notification API calls
export const notificationAPI = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  send: async (notificationData) => {
    const response = await api.post('/notifications/send', notificationData);
    return response.data;
  },

  sendToRoom: async (notificationData) => {
    const response = await api.post('/notifications/send-to-room', notificationData);
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  delete: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};

export default api;
