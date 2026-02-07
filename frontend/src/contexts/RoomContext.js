// TODO: Implement room context
// Your teammates will implement this with backend integration
export const RoomContext = null;
export const RoomProvider = ({ children }) => children;
export const useRoom = () => ({
  activeRoom: null,
  rooms: [],
  createRoom: async () => {},
  joinRoom: async () => {},
  leaveRoom: async () => {},
  deleteRoom: async () => {},
  loadUserRooms: async () => {}
});
