const { Expo } = require('expo-server-sdk');
const User = require('../../schemas/user');
const expo = new Expo();

/**
 * Sends a notification to all users
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
// async function sendNotificationToAll(title, body, data) {
//   // Get all tokens
//   const tokens = await User.find({}, 'pushToken').lean();
//   const pushTokens = tokens.map((user) => user.pushToken).filter((pushToken) => pushToken !== '');
//   const messages = pushTokens.map((token) => ({
//     to: token,
//     sound: 'default',
//     title: title,
//     body: body,
//     data: data,
//   }));

//   try {
//     await expo.sendPushNotificationsAsync(messages);
//   } catch (error) {
//     console.error('❌ Error sending notifications:', error);
//   }
// }

async function sendNotificationToAll(title, body, data) {
  const tokens = await User.find({}, 'pushToken').lean();
  const pushTokens = tokens.map((u) => u.pushToken).filter((t) => t);
  const messages = pushTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  let chunks = expo.chunkPushNotifications(messages);
  for (let chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('Notifications sent:', receipts);
    } catch (err) {
      console.error('❌ Error sending notifications chunk:', err);
    }
  }
}

module.exports = sendNotificationToAll;
