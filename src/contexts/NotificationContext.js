// src/contexts/NotificationContext.js
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

    console.log('📡 [Global] Setting up notification system for user:', user._id);

    // Wait for socket to connect before joining notifications
    const joinWithDelay = () => {
      // Check if socket is connected
      const checkAndJoin = () => {
        if (SocketService.getStatus().isConnected) {
          // Join user's personal notification channel
          SocketService.joinNotifications(user._id);
        } else {
          // Retry after 500ms
          setTimeout(checkAndJoin, 500);
        }
      };
      checkAndJoin();
    };

    joinWithDelay();

    // Listen for real-time notifications globally
    const handleNotification = (data) => {
      console.log('🔔 [Global] Notification received:', data.notification);

      // Show in-app alert popup
      Alert.alert(
        data.notification.title || 'New Notification',
        data.notification.message,
        [
          {
            text: 'View',
            onPress: () => {
              // Navigate to Notifications tab using navigationRef
              navigate('Notifications');
            },
          },
          { text: 'OK', style: 'default' },
        ]
      );
    };

    // Listen for the 'new-notification' event
    SocketService.on('new-notification', handleNotification);

    return () => {
      // Leave notification channel
      if (SocketService.getStatus().isConnected) {
        SocketService.leaveNotifications(user._id);
      }
      SocketService.off('new-notification', handleNotification);
      console.log('🔌 [Global] Removed notification listener and left channel');
    };
  }, [user]);

  const value = {};

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
