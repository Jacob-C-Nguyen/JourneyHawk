// Req 6/7: Sends push notifications to devices via Expo push notification service
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

// Req 7: Delivers push alert to a single user's registered device
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) {
    return null;
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
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
    return ticket;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
};

// Req 7: Delivers push alerts to all attendees with registered devices
const sendPushToMultipleUsers = async (users, title, body, data = {}) => {
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
    return [];
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return tickets;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return [];
  }
};

module.exports = {
  sendPushNotification,
  sendPushToMultipleUsers,
};
