const cron = require('node-cron');
const Order = require('../../schemas/order');
const { getDayStartEndTimeForTimezone } = require('../../utils/dateMethods');
const { sendNotificationToBoutique } = require('../../utils/notifications/sendMethods');
const { betterErrorLog } = require('../../utils/logMethods');

/**
 * Checks all reservations in database, counts those that are due for today
 * Sends a notification to all users about the amount of reservations at 8a.m.
 */
const startReservationsCheck = () => {
  async function task() {
    try {
      const date = getDayStartEndTimeForTimezone('Europe/Belgrade', 0);
      const ordersByBoutique = await Order.aggregate([
        {
          $match: {
            reservation: true,
            reservationDate: {
              $gte: date.startOfDay,
              $lt: date.endOfDay,
            },
          },
        },
        {
          $group: {
            _id: '$boutiqueId',
            count: { $sum: 1 },
          },
        },
      ]);

      for (const item of ordersByBoutique) {
        await sendNotificationToBoutique(item._id, '🛍️ Rezervacije za danas!', `Ukupno: ${item.count}`);
      }
    } catch (error) {
      betterErrorLog('> Error in startReservationsCheckTest:', error);
    }
  }

  const scheduleTimes = ['0 8 * * *', '0 10 * * *'];

  scheduleTimes.forEach((time) => {
    cron.schedule(time, task, {
      timezone: 'Europe/Belgrade',
    });
  });
};

const startReservationsCheckTest = () => {
  setTimeout(async () => {
    try {
      const date = getDayStartEndTimeForTimezone('Europe/Belgrade', 0);
      const ordersByBoutique = await Order.aggregate([
        {
          $match: {
            reservation: true,
            reservationDate: {
              $gte: date.startOfDay,
              $lt: date.endOfDay,
            },
          },
        },
        {
          $group: {
            _id: '$boutiqueId',
            count: { $sum: 1 },
          },
        },
      ]);

      for (const item of ordersByBoutique) {
        await sendNotificationToBoutique(item._id, '🛍️ Rezervacije za danas!', `Ukupno: ${item.count}`);
      }
    } catch (error) {
      betterErrorLog('> Error in startReservationsCheckTest:', error);
    }
  }, 7_000); // 7 seconds
};

module.exports = {
  startReservationsCheck,
  startReservationsCheckTest,
};
