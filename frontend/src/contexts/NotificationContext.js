import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

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

    const handleNotification = (data) => {
      setUnreadCount(prev => prev + 1);
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

  const clearUnreadCount = () => setUnreadCount(0);

  const value = { unreadCount, clearUnreadCount };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
