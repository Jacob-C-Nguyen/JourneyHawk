// src/services/pushNotificationService.js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

/**
 * Send push notification to a single user
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) {
    console.log('⚠️ No push token provided');
    return null;
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`❌ Push token ${pushToken} is not a valid Expo push token`);
    return null;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    badge: 1,
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log('📲 Push notification sent:', ticket);
    return ticket;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return null;
  }
};

/**
 * Send push notifications to multiple users
 */
const sendPushToMultipleUsers = async (users, title, body, data = {}) => {
  // Filter users with valid push tokens
  const messages = users
    .filter(user => user.pushToken && Expo.isExpoPushToken(user.pushToken))
    .map(user => ({
      to: user.pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      badge: 1,
    }));

  if (messages.length === 0) {
    console.log('⚠️ No valid push tokens found');
    return [];
  }

  try {
    // Expo recommends chunking notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log(`📲 Sent ${tickets.length} push notifications`);
    return tickets;
  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    return [];
  }
};

module.exports = {
  sendPushNotification,
  sendPushToMultipleUsers,
};
