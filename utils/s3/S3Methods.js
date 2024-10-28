const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const CustomError = require("../CustomError");
const dotenv = require('dotenv').config();
const s3 = require('./S3Client');
const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;
const crypto = require('crypto');
const sharp = require('sharp');
const { betterConsoleLog, betterErrorLog } = require("../logMethods");

function randomImageName(bytes = 32){
  return crypto.randomBytes(bytes).toString('hex');
}
async function resizeImage(buffer, x = 1080, y = 1920){
  return await sharp(buffer).resize({width: x, height: y, fit:'contain'}).toBuffer();
}

async function uploadMediaToS3(file, next) {
  try {
    // const modifiedImageBuffer = await resizeImage(file.buffer, 240, 320);
    const modifiedImageBuffer = await resizeImage(file.buffer, 480, 640);
    const imageName = `${randomImageName()}.jpeg`;
    const params = {
      Bucket: bucket_name,
      Key: imageName,
      Body: modifiedImageBuffer,
      ACL: 'public-read',
      ContentType: file.mimeType,
    }
    const command = new PutObjectCommand(params);
    const s3_response = await s3.send(command);

    // Construct and return the link for the image
    if(s3_response.$metadata.httpStatusCode === 200){
      const response = {
        uri: `https://${bucket_name}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${imageName}`,
        imageName: imageName
      }
      return response;
    } else {
      return next(new CustomError('Došlo je do problema prilikom uploadovanja slike', s3_response.$metadata.httpStatusCode));
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error uploading media to the s3 bucket:', error);
    return next(new CustomError('Došlo je do problema prilikom uploadovanja slike', statusCode));
  }
}

async function deleteMediaFromS3(imageName){
  try{
    const params = {
      Bucket: bucket_name,
      Key: imageName
    }
    const command = new DeleteObjectCommand(params);
    const result = await s3.send(command);
    if(result.$metadata.httpStatusCode !== 204){
      betterConsoleLog('> Error while deleting the image from the S3 bucket', result);
    }

  } catch (error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting media from the s3 bucket:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja slike', statusCode));
  }
}

module.exports = { uploadMediaToS3, deleteMediaFromS3 };
