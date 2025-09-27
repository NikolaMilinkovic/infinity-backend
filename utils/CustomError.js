// How to use:
// const err = new CustomError('message', statusCode);
// next(err)

require('dotenv').config();
const logtail = require('../utils/logger');
const { Discord } = require('./discord/infinityErrorBot');
const { betterErrorLog } = require('./logMethods');

class CustomError extends Error {
  constructor(message, statusCode, req = null, passedData = null) {
    super(message || 'Something went wrong..');
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    this.passedData = passedData;

    if (req) {
      logtail.error(`[${req.method}] ${req.originalUrl} - Code: ${this.statusCode} | ${this.message}`, {
        statusCode: this.statusCode,
        stack: this.stack,
        passedData: this.passedData,
      });
    } else {
      logtail.error(`Code: ${this.statusCode} | ${this.message}`, {
        statusCode: this.statusCode,
        stack: this.stack,
        passedData: this.passedData,
      });
    }

    Discord.logError(this, req, passedData);
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
