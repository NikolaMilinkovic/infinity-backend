const { startReservationsCheck, startReservationsCheckTest } = require('./notifications/reservationsScheduler');

/**
 * Here we call and start all schedulers
 */
const startAllSchedulers = () => {
  console.log('> Starting all schedulers');
  startReservationsCheck();
  // startReservationsCheckTest();
};

module.exports = startAllSchedulers;
