const { scheduleDatabaseBackup } = require('./database/backupDatabase');
const { startReservationsCheck } = require('./notifications/reservationsScheduler');
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Here we call and start all schedulers
 */
const startAllSchedulers = () => {
  if (isProduction) {
    startReservationsCheck();
    scheduleDatabaseBackup();
  }
};

module.exports = startAllSchedulers;
