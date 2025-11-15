const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const CustomError = require('../CustomError');
const dotenv = require('dotenv').config();
const s3 = require('./S3Client');
const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;
const crypto = require('crypto');
const sharp = require('sharp');
const { betterConsoleLog, betterErrorLog } = require('../logMethods');
const fs = require('fs');

function randomImageName(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
async function resizeImage(buffer, x = 1080, y = 1800) {
  return await sharp(buffer)
    .resize({
      width: x,
      height: y,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp()
    .toBuffer();
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-UK').replace(/\//g, '-');
}
function getCurrentTime() {
  return new Date().toISOString().slice(11, 16).replace(':', '');
}

async function uploadMediaToS3(file, folderPath = '', withResize = true, tag = null, x = 480, y = 640) {
  try {
    let imageBuffer = file.buffer;
    if (withResize) {
      imageBuffer = await resizeImage(file.buffer, x, y);
    }
    const imageName = `${randomImageName()}.jpeg`;

    // Build the S3 key: either with folderPath or root
    const key = folderPath ? `${folderPath.replace(/\/$/, '')}/${imageName}` : imageName;

    const params = {
      Bucket: bucket_name,
      Key: key,
      Body: imageBuffer,
      ACL: 'public-read',
      ContentType: file.mimeType,
    };
    // S3 expects tags as URL-encoded string: key1=value1&key2=value2
    if (tag) {
      params.Tagging = `Type=${tag}`;
    }

    const command = new PutObjectCommand(params);
    const s3_response = await s3.send(command);

    if (s3_response.$metadata.httpStatusCode === 200) {
      return {
        uri: `https://${bucket_name}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${key}`,
        imageName: imageName,
      };
    } else {
      throw new CustomError('Došlo je do problema prilikom uploadovanja slike', s3_response.$metadata.httpStatusCode);
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error uploading media to the s3 bucket:', error);
    throw new CustomError('Došlo je do problema prilikom uploadovanja slike', statusCode);
  }
}

async function deleteMediaFromS3(imageName, path = '') {
  try {
    // If path is provided, prepend it to the filename
    const key = path ? `${path.replace(/\/$/, '')}/${imageName}` : imageName;

    const params = {
      Bucket: bucket_name,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    const result = await s3.send(command);

    if (result.$metadata.httpStatusCode !== 204) {
      betterConsoleLog('> Error while deleting the image from the S3 bucket', result);
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting media from the s3 bucket:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja slike', statusCode));
  }
}

async function uploadFileToS3(fileName = '', file, filePath = '', next) {
  try {
    if (!fileName) next(new CustomError('Ime fajla je neophodno.', 404));
    const key = filePath ? `${filePath.replace(/\/$/, '')}/${fileName}` : fileName;

    const params = {
      Bucket: bucket_name,
      Key: key,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimeType,
    };

    const command = new PutObjectCommand(params);
    const s3_response = await s3.send(command);

    if (s3_response.$metadata.httpStatusCode === 200) {
      const response = {
        uri: `https://${bucket_name}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${key}`,
        fileName: fileName,
      };
      return response;
    } else {
      return next(new CustomError('There was a problem uploading the file', s3_response.$metadata.httpStatusCode));
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error uploading file to the s3 bucket:', error);
    return next(new CustomError('Došlo je do problema prilikom uploadovanja fajla', statusCode));
  }
}

async function uploadLocalFileToS3(filePath, s3Key) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const params = {
      Bucket: bucket_name,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/zip',
    };

    const command = new PutObjectCommand(params);
    const s3_response = await s3.send(command);

    if (s3_response.$metadata.httpStatusCode === 200) {
      console.log('> DB dump stored successfully to storage');
      return `https://${bucket_name}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${s3Key}`;
    } else {
      throw new Error('Upload failed');
    }
  } catch (err) {
    console.error('Failed to upload file to S3:', err);
    throw err;
  }
}

module.exports = {
  uploadMediaToS3,
  deleteMediaFromS3,
  uploadFileToS3,
  uploadLocalFileToS3,
  getCurrentDate,
  getCurrentTime,
};
