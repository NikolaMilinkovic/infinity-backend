const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  PutObjectTaggingCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const dotenv = require('dotenv').config();
const s3 = require('./S3Client');
const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;
const crypto = require('crypto');
const sharp = require('sharp');
const { betterConsoleLog, betterErrorLog } = require('../logMethods');
const User = require('../../schemas/user');
const Boutique = require('../../schemas/boutiqueSchema');
const { decodeUserIdFromToken } = require('../decodeUserIdFromToken');

function randomImageName(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
async function resizeImage(buffer, x = 1080, y = 1920) {
  return await sharp(buffer).resize({ width: x, height: y, fit: 'contain' }).toBuffer();
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-UK').replace(/\//g, '-');
}

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * Creates new log folder for the month in S3
 * Will create subfolders for each user if missing
 */
async function createMonthlyLogFolder(path = '') {
  try {
    if (!path) throw new Error('createMonthlyLogFolder requires a valid path!');
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth();
    const monthName = monthNames[monthNum];

    const monthFolderKey = `${path.replace(/\/$/, '')}/logs/${year}-${monthName}/`;

    // Ensure month folder exists
    await s3.send(new PutObjectCommand({ Bucket: bucket_name, Key: monthFolderKey, Body: '' }));

    // Check contents
    const listResult = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket_name, Prefix: monthFolderKey, MaxKeys: 1 })
    );
    if (!listResult.Contents || listResult.Contents.length === 0) {
      // Create subfolders & today's log files for each user
      await createUserLogFiles(monthFolderKey);
    }

    return { folderKey: monthFolderKey };
  } catch (error) {
    console.error('Error creating monthly log folder:', error);
    throw error;
  }
}

/**
 * Creates a folder for each user and a log file for today
 * @param {string} monthFolderKey - 'logs/2025-09(september)/'
 */
async function createUserLogFiles(monthFolderKey) {
  try {
    const users = await User.find({}, { username: 1, _id: 1 });
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    for (const user of users) {
      const userFolderKey = `${monthFolderKey}${user._id}_[${user.username}]/`;
      // Create folder for user
      await s3.send(new PutObjectCommand({ Bucket: bucket_name, Key: userFolderKey, Body: '' }));

      const fileName = `${day}-${monthStr}-${year}_log.txt`;
      const fileKey = `${userFolderKey}${fileName}`;

      const params = {
        Bucket: bucket_name,
        Key: fileKey,
        Body: `[Log for ${user.username} (${user._id}) | Date: ${day}-${monthStr}-${year}]\n`,
        ContentType: 'text/plain',
      };

      await s3.send(new PutObjectCommand(params));
      console.log(`Created daily log file for user ${user.username}: ${fileKey}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating user log files:', error);
    throw error;
  }
}

/**
 * Creates a new log file for the new user in the current log folder
 * @param {*} user
 * @param {string} path - Usualy this is a boutiqueName field
 */
async function addLogFileForNewUser(user, path = '') {
  try {
    if (!path) throw new Error('addLogFileForNewUser requires a valid path!');
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth();
    const monthName = monthNames[monthNum];
    const monthStr = String(monthNum + 1).padStart(2, '0');

    const folderName = `${year}-${monthName}(${monthStr})`;
    const folderKey = `clients/${path.replace(/\/$/, '')}/logs/${folderName}/`;

    const fileName = `${user._id}_${user.username}_${monthName}_${year}_log.txt`;
    const fileKey = `${folderKey}${fileName}`;

    const params = {
      Bucket: bucket_name,
      Key: fileKey,
      Body: `[Log for ${user.username} (${user._id}) | Period: ${monthName} ${year}]\n`,
      ContentType: 'text/plain',
    };

    await s3.send(new PutObjectCommand(params));
    console.log(`Created log file for new user ${user.username}: ${fileKey}`);
  } catch (error) {
    console.error('Error adding log file for new user:', error);
    throw error;
  }
}

/**
 * Renames the log file for the updated user, only to be used if we are updating the username of the user
 * @param {User _id} userId
 * @param {Old username} oldUsername
 * @param {New Username} newUsername
 * @param {Boutique Name to be used inside path} path
 */
async function renameUserLogFile(userId, oldUsername, newUsername, path = '') {
  try {
    if (!path) throw new Error('renameUserLogFile requires a valid path!');
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth();
    const monthName = monthNames[monthNum];
    const monthStr = String(monthNum + 1).padStart(2, '0');

    const folderName = `${year}-${monthName}(${monthStr})`;
    const folderKey = `clients/${path.replace(/\/$/, '')}/logs/${folderName}/`;

    const oldFileKey = `${folderKey}${userId}_${oldUsername}_${monthName}_${year}_log.txt`;
    const newFileKey = `${folderKey}${userId}_${newUsername}_${monthName}_${year}_log.txt`;

    // Copy existing file to new key
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket_name,
        CopySource: `${bucket_name}/${oldFileKey}`,
        Key: newFileKey,
      })
    );

    // Delete the old file
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket_name,
        Key: oldFileKey,
      })
    );

    console.log(`Renamed log file from ${oldFileKey} → ${newFileKey}`);
  } catch (error) {
    console.error('Error renaming user log file:', error);
    throw error;
  }
}

async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}
/**
 * Formats a Date object to "dd/month/yyyy hh:mm"
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} | ${hours}:${minutes}`;
}

async function writeToLog(req, logContent, provided_JWT) {
  try {
    // 1. Decode user
    let token = provided_JWT || req.headers.authorization;
    if (!token) throw new Error('Authorization token missing');

    const userId = decodeUserIdFromToken(token);
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found while writing to log');
    const boutique = await Boutique.findById(user.boutiqueId);
    if (!boutique) throw new Error('Boutique not found while writing to log');

    // 2. Determine folder and file paths
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth();
    const monthName = monthNames[monthNum];
    const monthStr = String(monthNum + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');

    const monthFolderKey = `clients/${boutique.boutiqueName}/logs/${year}-${monthName}(${monthStr})/`;
    const userFolderKey = `${monthFolderKey}${user._id}_[${user.username}]/`;

    // Ensure month and user folder exist
    if (!(await folderExists(monthFolderKey))) await createMonthlyLogFolder(boutique.boutiqueName);
    if (!(await folderExists(userFolderKey)))
      await s3.send(new PutObjectCommand({ Bucket: bucket_name, Key: userFolderKey, Body: '' }));

    // Daily log file
    const fileKey = `${userFolderKey}${dayStr}-${monthStr}-${year}_log.txt`;

    // 3. Get existing log content
    let existingContent = '';
    try {
      const getCommand = new GetObjectCommand({ Bucket: bucket_name, Key: fileKey });
      const s3Response = await s3.send(getCommand);
      existingContent = await streamToString(s3Response.Body);
    } catch (err) {
      existingContent = `[Log for ${user.username} (${user._id}) | Date: ${dayStr}-${monthStr}-${year}]\n`;
    }

    // 4. Append new entry
    const timestamp = formatTimestamp(now);
    const updatedContent = `${existingContent}[${timestamp}] ${logContent}\n`;

    // 5. Upload updated log
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket_name,
        Key: fileKey,
        Body: updatedContent,
        ContentType: 'text/plain',
      })
    );
  } catch (error) {
    betterErrorLog('> Error while writing to log:', error);
    throw error;
  }
}

/**
 * Check existence of folder in S3
 * @param {Folder path} folderKey
 * @returns boolean
 */
async function folderExists(folderKey) {
  const params = {
    Bucket: bucket_name,
    Prefix: folderKey,
    MaxKeys: 1,
  };

  const result = await s3.send(new ListObjectsV2Command(params));
  return result.Contents && result.Contents.length > 0;
}

async function ensureTagsOnAllProfileImages() {
  const prefix = 'clients/infinity_boutique/images/profiles/';
  const tags = [{ Key: 'Type', Value: 'orderProfileImage' }];
  let token;
  let count = 0;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket_name,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );

    for (const obj of list.Contents || []) {
      await s3.send(
        new PutObjectTaggingCommand({
          Bucket: bucket_name,
          Key: obj.Key,
          Tagging: { TagSet: tags },
        })
      );

      count++;
      console.log(`> Tagged image number ${count}`);
      if (count % 999 === 0) {
        console.log(`Tagged ${count} images so far...`);
      }
    }

    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);

  console.log('Done tagging all objects.');
}

module.exports = {
  createMonthlyLogFolder,
  createUserLogFiles,
  addLogFileForNewUser,
  renameUserLogFile,
  writeToLog,
  ensureTagsOnAllProfileImages,
};
