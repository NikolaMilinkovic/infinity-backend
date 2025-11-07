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

/**
 * Sends a notification to all users from a specified boutique
 * @param {string} boutiqueId
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
async function sendNotificationToBoutique(boutiqueId, title, body, data) {
  const users = await User.find({ boutiqueId }, 'pushToken').lean();
  const pushTokens = users.map((u) => u.pushToken).filter(Boolean);

  if (pushTokens.length === 0) return;

  const messages = pushTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log(`✅ Notifications sent to boutique ${boutiqueId}:`, receipts);
    } catch (err) {
      console.error(`❌ Error sending notifications for boutique ${boutiqueId}:`, err);
    }
  }
}

module.exports = {
  sendNotificationToAll,
  sendNotificationToBoutique,
};
