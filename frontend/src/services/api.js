import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? 'https://journeyhawk-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  sendOTP: async (userData) => {
    const response = await api.post('/auth/send-otp', userData);
    return response.data;
  },

  verifyOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },
};

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
