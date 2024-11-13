const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();
const authModule = require('./middleware/authMiddleware')();
const { getSocketInstance } = require('./utils/socket');

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
app.use(express.urlencoded({ extended: true }));
// app.use(multer().any());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// =====================[ AUTH ]=====================
authModule.initializeAuth(app);
// =====================[ \AUTH ]=====================

// ===============[ MongoDB connection ]=============== //
const conn_string = process.env.DB_URL;
mongoose.connect(conn_string)
.then(() => {
  initializeAppSettings();
}).catch((error) => {
  console.error('MongoDB connection error', error);
});
const database = mongoose.connection;
if(database){
  console.log('> Connected to Database');
}
database.on('error', console.error.bind(console, 'mongo connection error'));
// ===============[ \MongoDB connection ]=============== //

// Call seedPurses on server start, creates 1000 purse 
// mongoose.connection.once('open', async () => {
  // await seedPurses();
// });

// Example usage of adding new user on startup
// const { addUserOnStartup } = require('./utils/helperMethods');
// addUserOnStartup('helvos', 'helvos');

const { resetAllOrdersPackedState, resetAllOrdersProcessedState } = require('./utils/helperMethods');
resetAllOrdersPackedState();
resetAllOrdersProcessedState();

// =====================[ UNPROTECTED ROUTES ]=====================
app.post('/login', authModule.login);
// =====================[ \UNPROTECTED ROUTES ]=====================


// =====================[ PROTECTED ROUTERS ]======================
app.use(authModule.authenticateJWT);
const io = getSocketInstance();

const appRouter = require('./routers/appRouter');
app.use('/app', appRouter);

const userRouter = require('./routers/user');
app.use('/user', userRouter);

const productsRouter = require('./routers/products');
app.use('/products', productsRouter);

const colorsRouter = require('./routers/colors');
app.use('/colors', colorsRouter);

const categoriesRouter = require('./routers/category');
app.use('/categories', categoriesRouter);

const ordersRouter = require('./routers/orders');
app.use('/orders', ordersRouter);

const couriersRouter = require('./routers/couriers');
app.use('/couriers', couriersRouter);
// =====================[ \PROTECTED ROUTERS ]=====================


// =====================[ ERROR HANDLERS ]======================
const errorHandler = require('./controllers/errorController');
const { seedPurses } = require('./utils/testDummyData');
const { initializeAppSettings } = require('./schemas/appSchema');
app.use(errorHandler);
// =====================[ \ERROR HANDLERS ]=====================

module.exports = app;
