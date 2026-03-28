import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

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
  async registerForPushNotifications() {
    if (isExpoGo) {
      return null;
    }

    if (!Device.isDevice) {
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;

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

  addNotificationListener(callback) {
    if (isExpoGo) {
      return null;
    }

    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification listener:', error);
      return null;
    }
  }

  addNotificationResponseListener(callback) {
    if (isExpoGo) {
      return null;
    }

    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification response listener:', error);
      return null;
    }
  }

  removeNotificationSubscription(subscription) {
    if (isExpoGo || !subscription) {
      return;
    }

    try {
      if (Notifications.removeNotificationSubscription) {
        Notifications.removeNotificationSubscription(subscription);
      }
    } catch (error) {
      console.error('Error removing notification subscription:', error);
    }
  }

  async scheduleLocalNotification(title, body, data = {}) {
    if (isExpoGo) {
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
        trigger: null,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }
}

export default new NotificationService();
