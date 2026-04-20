// src/services/notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authAPI } from './api';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior (only if not in Expo Go)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  /**
   * Register device for push notifications
   * Returns the Expo push token or null if registration fails
   */
  async registerForPushNotifications() {
    // Skip if in Expo Go
    if (isExpoGo) {
      console.log('Push notifications not available in Expo Go');
      console.log('In-app notifications via Socket.io still work!');
      return null;
    }

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If permission denied, cannot proceed
      if (finalStatus !== 'granted') {
        console.log('Permission denied for push notifications');
        return null;
      }

      // Get the Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);

      // Send token to backend to save in user's profile
      try {
        await authAPI.updatePushToken({ pushToken: token });
        console.log('Push token saved to backend');
      } catch (error) {
        console.error('Failed to save push token to backend:', error);
      }

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'JourneyHawk Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
          sound: 'default',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Add listener for when notification is received while app is in foreground
   */
  addNotificationListener(callback) {
    if (isExpoGo) {
      console.log('Notification listeners not available in Expo Go');
      return null;
    }

    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification listener:', error);
      return null;
    }
  }

  /**
   * Add listener for when user taps on a notification
   */
  addNotificationResponseListener(callback) {
    if (isExpoGo) {
      console.log('Notification response listeners not available in Expo Go');
      return null;
    }

    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification response listener:', error);
      return null;
    }
  }

  /**
   * Remove notification subscription
   */
  removeNotificationSubscription(subscription) {
    if (isExpoGo || !subscription) {
      return;
    }

    try {
      // Check if the function exists before calling
      if (Notifications.removeNotificationSubscription) {
        Notifications.removeNotificationSubscription(subscription);
      }
    } catch (error) {
      console.error('Error removing notification subscription:', error);
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title, body, data = {}) {
    if (isExpoGo) {
      console.log('Local notifications not available in Expo Go');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }
}

export default new NotificationService();
