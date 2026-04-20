// src/services/api.js
// Core API service - all backend communication flows through here
// - Axios instance with JWT token auto-injection via interceptor
// - Auth API: signup (Req 3), login (Req 2)
// - Room API: create (Req 15, 18), join (Req 13, 14), leave (Req 12), getUserRooms (Req 10)
// - Location API: update (Req 8), getRoomLocations (Req 9)
// - Notification API: getAll (Req 6), sendToRoom (Req 7), markAsRead, delete
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// API_URL is set via the API_URL environment variable (in .env or shell).
// Falls back to Railway production if not set.
// Local dev example: add API_URL=http://192.168.x.x:3000/api to your .env file.
const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? 'https://journeyhawk-production.up.railway.app/api';

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

  verifyEmail: async (email, otp) => {
    const response = await api.post('/auth/verify-email', { email, otp });
    return response.data;
  },

  resendOtp: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
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

  removeAttendee: async (roomId, attendeeId) => {
    const response = await api.delete(`/rooms/${roomId}/attendees/${attendeeId}`);
    return response.data;
  },

  inviteAttendee: async (roomId, phone) => {
    const response = await api.post(`/rooms/${roomId}/invite`, { phone });
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
