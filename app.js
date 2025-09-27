const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const authModule = require('./middleware/authMiddleware')();
const { initializeProductDisplayCounter } = require('./schemas/productDisplayCounter');
const { initializeLastUpdatedTracker } = require('./schemas/lastUpdated');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// app.use(multer().any());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// =====================[ AUTH ]=====================
authModule.initializeAuth(app);
// =====================[ \AUTH ]=====================

// ===============[ MongoDB connection ]=============== //
const conn_string = process.env.DB_URL;
mongoose
  .connect(conn_string)
  .then(() => {
    initializeAppSettings();
    initializeProductDisplayCounter();
    initializeLastUpdatedTracker();
  })
  .catch((error) => {
    betterErrorLog('> MongoDB connection error', error);
  });
const database = mongoose.connection;
if (database) {
  console.log('> Connected to Database');
}
database.on('error', console.error.bind(console, '> MongoDB connection error'));
// ===============[ \MongoDB connection ]=============== //

// Call seedPurses on server start, creates 1000 purse
// const { seedPurses } = require('./utils/testDummyData');
// mongoose.connection.once('open', async () => {
// await seedPurses(1000);
// });

// Create 100 fake orders on startup
// const { createFakeOrders } = require('./utils/fakeOrdersSeeder');
// createFakeOrders();

// Example usage of adding new user on startup
// const { addUserOnStartup } = require('./utils/helperMethods');
// addUserOnStartup('Nikola', 'Nikola');
const {
  updateProductsWithNewFields,
  updateAllUsersWithNewFields,
  updateTotalDressStock,
  updateTotalPurseStock,
  updateUserPermissions,
} = require('./utils/updateAllOnStartup');

// Adds permissions
// updateUserPermissions();

// updateTotalDressStock();
// updateTotalPurseStock();

// Script that goes through all users and adds them the missing fields
// Doesnt rewrite the currently set fields, it skips them
// Only adds the missing ones
// updateAllUsersWithNewFields();
// updateProductsWithNewFields();
const { ensureLastUpdatedDocument, ensureAppSettingsDocument } = require('./utils/helperMethods');
ensureLastUpdatedDocument();

// const { getSumOfAllProducts } = require('./utils/helperMethods');
// getSumOfAllProducts();

// curl http://localhost:3000/test_discord_error_log
// app.use('/test_discord_error_log', (req, res, next) => {
//   const { Discord } = require('./utils/discord/infinityErrorBot');
//   const fakeError = new Error('This is a test error from the app 🚧');
//   Discord.logError(fakeError, req);
//   return res.send('OK');
// });

// =====================[ NODE-CRON SCHEDULERS ]=====================
const startAllSchedulers = require('./schedulers/scheduler');
startAllSchedulers();
// =====================[ \NODE-CRON SCHEDULERS ]=====================

// =====================[ UNPROTECTED ROUTES ]=====================
app.post('/login', authModule.login);
// app.post('/verify-user', authModule.verifyUser);
// =====================[ \UNPROTECTED ROUTES ]=====================

// =====================[ PROTECTED ROUTERS ]======================
app.use(authModule.authenticateJWT);

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

const suppliersRouter = require('./routers/suppliers');
app.use('/suppliers', suppliersRouter);

const lastUpdatedRouter = require('./routers/updatesTracker');
app.use('/last-updated', lastUpdatedRouter);
// =====================[ \PROTECTED ROUTERS ]=====================

// =====================[ ERROR HANDLERS ]======================
const errorHandler = require('./controllers/errorController');
const { initializeAppSettings } = require('./schemas/appSchema');
const { betterErrorLog } = require('./utils/logMethods');
app.use(errorHandler);
// =====================[ \ERROR HANDLERS ]=====================

// const { createMonthlyLogFolder, createUserLogFiles } = require('./utils/s3/S3Methods');
// createMonthlyLogFolder();
// createUserLogFiles('logs/2025-september(09)/');

module.exports = app;
