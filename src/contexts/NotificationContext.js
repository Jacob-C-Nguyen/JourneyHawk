// Req 6: Listens globally for new-notification socket events and shows in-app alert
// Req 7: Alert includes a "View" button that navigates to the Notifications tab
import React, { createContext, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import SocketService from '../services/socket';
import { useAuth } from './AuthContext';
import { navigate } from '../navigation/navigationRef';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Req 6: Join personal notification channel once socket is ready
    const joinWithDelay = () => {
      const checkAndJoin = () => {
        if (SocketService.getStatus().isConnected) {
          SocketService.joinNotifications(user._id);
        } else {
          setTimeout(checkAndJoin, 500);
        }
      };
      checkAndJoin();
    };

    joinWithDelay();

    // Req 6/7: Show alert popup when a notification arrives in real-time
    const handleNotification = (data) => {
      Alert.alert(
        data.notification.title || 'New Notification',
        data.notification.message,
        [
          {
            text: 'View',
            onPress: () => {
              navigate('Notifications');
            },
          },
          { text: 'OK', style: 'default' },
        ]
      );
    };

    SocketService.on('new-notification', handleNotification);

    return () => {
      if (SocketService.getStatus().isConnected) {
        SocketService.leaveNotifications(user._id);
      }
      SocketService.off('new-notification', handleNotification);
    };
  }, [user]);

  const value = {};

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
