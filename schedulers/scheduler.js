const { startReservationsCheck } = require('./notifications/reservationsScheduler');

/**
 * Here we call and start all schedulers
 */
const startAllSchedulers = () => {
  console.log('> Starting all schedulers');
  startReservationsCheck();
};

module.exports = startAllSchedulers;
