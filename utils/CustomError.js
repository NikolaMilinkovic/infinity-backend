// How to use:
// const err = new CustomError('message', statusCode);
// next(err)

class CustomError extends Error{
  constructor(message, statusCode){
    super(message || 'Something went wrong..');
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;