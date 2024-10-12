const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv').config();

const bucket_region = process.env.BUCKET_REGION;
const access_key = process.env.ACCESS_KEY;
const secret_access_key = process.env.SECRET_ACCESS_KEY;

// Initialize the S3 client
const s3 = new S3Client({
  credentials: {
    accessKeyId: access_key,
    secretAccessKey: secret_access_key,
  },
  region: bucket_region
})

module.exports = s3;
