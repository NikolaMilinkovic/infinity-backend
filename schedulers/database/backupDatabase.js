const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const { zipFolder } = require('../../utils/zipFolder');
const databaseConnectionString = process.env.DB_URL;
const isProduction = process.env.NODE_ENV === 'production';
const path = require('path');
const { uploadLocalFileToS3 } = require('../../utils/s3/S3DefaultMethods');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) console.error(stderr);
      resolve(stdout);
    });
  });
}
function getCurrentDate() {
  return new Date().toLocaleDateString('en-UK').replace(/\//g, '-');
}
function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 0-indexed
  return `${year}-${month}`;
}

async function backupDatabase() {
  try {
    const date = getCurrentDate();
    const yearMonth = getCurrentYearMonth();
    let backupFolder = '/tmp';
    let command = `mongodump --uri="${databaseConnectionString}" --out="${backupFolder}" --gzip`;
    let zipFilePath = `../../tmp/db-backup-${date}.zip`;
    let dbFolderPathForZipping = `${backupFolder}/infinity_boutique_app`;

    if (!isProduction) {
      backupFolder = path.join(__dirname, '..', '..', 'tmp');
      command = `mongodump.exe --uri="${databaseConnectionString}" --out="${backupFolder}" --gzip`;
      zipFilePath = path.join(backupFolder, `db-backup-${date}.zip`);
      dbFolderPathForZipping = path.join(backupFolder, 'infinity_boutique_app');
    }

    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }

    // Dump DB
    await execPromise(command);

    // Zip DB
    await zipFolder(dbFolderPathForZipping, zipFilePath);

    // Upload to storage
    await uploadLocalFileToS3(zipFilePath, `db_backup/${yearMonth}/db-backup-${date}.zip`);
  } catch (err) {
    console.error('> Backup setup failed:', err);
  }
}

function scheduleDatabaseBackup() {
  const scheduleTimes = ['0 4 * * *'];
  scheduleTimes.forEach((time) => {
    cron.schedule(time, backupDatabase, {
      timezone: 'Europe/Belgrade',
    });
  });

  // setTimeout(() => {
  //   backupDatabase();
  // }, 5000);
}

module.exports = { scheduleDatabaseBackup };
