require('dotenv').config();
const CustomError = require('../utils/CustomError');

// Development environment errors
const devErrors = (res, err) => {
  res.status(err.statusCode).json({
    status: err.statusCode,
    message: err.message,
    stackTrace: err.stack,
    error: err
  });
};
// Production environment errors
const prodErrors = (res, err) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message || 'Something went wrong! Please try again later'
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong! Please try again later'
    });
  }
};
// Reference for future error handling method
const castErrorHandler = (err) => {
  const message = `Invalid value for ${err.path}: ${err.value}!`;
  return new CustomError(message, 400);
};

module.exports = (err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV;
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if(NODE_ENV === 'development'){
    devErrors(res, err);
  } else if (NODE_ENV === 'production'){

    // As reference for future error handling
    if(err.name === 'castError'){
      err = castErrorHandler(err);
    }
    prodErrors(res, err);
  }
}