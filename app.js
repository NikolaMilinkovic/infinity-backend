const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
// ===============[ CORS Options ]=============== //
app.use(cors());
// const allowedOrigins = [
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
// };
// app.use(cors(corsOptions));
// ===============[ \CORS Options ]=============== //

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// =====================[ AUTH ]=====================
const authModule = require('./authMiddleware')();
authModule.initializeAuth(app);
// =====================[ \AUTH ]=====================

// ===============[ MongoDB connection ]=============== //
const conn_string = process.env.DB_URL;
mongoose.connect(conn_string);
const database = mongoose.connection;
if(database){
  console.log('> Connected to Database')
}
database.on('error', console.error.bind(console, 'mongo connection error'));
// ===============[ \MongoDB connection ]=============== //


// =====================[ UNPROTECTED ROUTES ]=====================
app.post('/login', authModule.login);
// =====================[ \UNPROTECTED ROUTES ]=====================
app.use(authModule.authenticateJWT);
// =====================[ PROTECTED ROUTES ]=====================


// =====================[ \UNPROTECTED ROUTES ]=====================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
