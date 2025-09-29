// How to use:
// const err = new CustomError('message', statusCode);
// next(err)

require('dotenv').config();
const logtail = require('../utils/logger');
const { Discord } = require('./discord/infinityErrorBot');
const { writeToLog } = require('../utils/s3/S3Methods');

/**
 * message - String
 * statusCode - Number
 * req - Request object - Can be null
 * passedData - Any data that we want logged when error is thrown so that we have good debuging context - Can be null
 */
class CustomError extends Error {
  constructor(message, statusCode, req = null, passedData = null) {
    super(message || 'Something went wrong..');
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    this.passedData = passedData;

    if (req) {
      const authHeader = req.headers['authorization'];
      let token = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      logtail.error(`[${req.method}] ${req.originalUrl} - Code: ${this.statusCode} | ${this.message}`, {
        statusCode: this.statusCode,
        stack: this.stack,
        passedData: this.passedData,
      });
      writeToLog(
        req,
        `[ERROR]${this.message}\n[Method] ${req.method}\n[Path] ${req.originalUrl}\n[Code] ${this.code}.}\n${this.stack}`,
        token
      );
    } else {
      logtail.error(`Code: ${this.statusCode} | ${this.message}`, {
        statusCode: this.statusCode,
        stack: this.stack,
        passedData: this.passedData,
      });
      writeToLog({}, `[ERROR]${this.message}\n[Code] ${this.statusCode}.}\n${this.stack}\n[PASSED DATA] ${passedData}`);
    }

    Discord.logError(this, req, passedData);
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
