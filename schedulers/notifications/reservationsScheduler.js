const cron = require('node-cron');
const Order = require('../../schemas/order');
const { getDayStartEndTimeForTimezone } = require('../../utils/dateMethods');
const sendNotificationToAll = require('../../utils/notifications/sendNotificationToAll');

/**
 * Checks all reservations in database, counts those that are due for today
 * Sends a notification to all users about the amount of reservations at 8a.m.
 */
const startReservationsCheck = () => {
  async function task() {
    try {
      const date = getDayStartEndTimeForTimezone();
      const orders = await Order.find({
        reservation: true,
        reservationDate: {
          $gte: date.startOfDay,
          $lt: date.endOfDay,
        },
      });
      sendNotificationToAll('🛍️ Rezervacije za danas!', `Ukupno: ${orders.length}`);
    } catch (error) {
      betterErrorLog('> Error in startReservationsCheck:', error);
    }
  }

  const scheduleTimes = ['0 8 * * *', '0 10 * * *'];

  scheduleTimes.forEach((time) => {
    cron.schedule(time, task, {
      timezone: 'Europe/Belgrade',
    });
  });
};

module.exports = {
  startReservationsCheck,
};
