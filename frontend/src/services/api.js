// TODO: Implement API service
// Your teammates will implement this with Axios and backend endpoints
export const authAPI = {
  signup: async (userData) => {},
  login: async (credentials) => {},
  getMe: async () => {}
};

export const roomAPI = {
  create: async (roomData) => {},
  join: async (roomCode) => {},
  getUserRooms: async () => {},
  leave: async (roomId) => {},
  delete: async (roomId) => {}
};

export const locationAPI = {
  update: async (locationData) => {},
  getRoomLocations: async (roomId) => {}
};

export const notificationAPI = {
  getAll: async () => {},
  send: async (notificationData) => {},
  markAsRead: async (notificationId) => {},
  delete: async (notificationId) => {}
};
