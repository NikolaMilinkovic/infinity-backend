const { Expo } = require('expo-server-sdk');
const User = require('../../schemas/user');
const expo = new Expo();

/**
 * Sends a notification to all users
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
async function sendNotificationToAll(title, body, data) {
  // Get all tokens
  const tokens = await User.find({}, 'pushToken').lean();
  const pushTokens = tokens.map((user) => user.pushToken).filter((pushToken) => pushToken !== '');
  const messages = pushTokens.map((token) => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  }));

  try {
    await expo.sendPushNotificationsAsync(messages);
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
  }
}

module.exports = sendNotificationToAll;
