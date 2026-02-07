// TODO: Implement notification context
// Your teammates will implement this with backend integration
export const NotificationProvider = ({ children }) => children;
export const useNotifications = () => ({
  notifications: [],
  unreadCount: 0,
  sendNotification: async () => {}
});
