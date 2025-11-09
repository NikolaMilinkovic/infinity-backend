const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const authModule = require('./middleware/authMiddleware')();

const app = express();

// ===============[ CORS Options ]=============== //
app.use(cors());

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
mongoose.connect(conn_string).catch((error) => {
  betterErrorLog('> MongoDB connection error', error);
});
const database = mongoose.connection;
if (database) {
  console.log('> Connected to Database');
}
database.on('error', console.error.bind(console, '> MongoDB connection error'));
// ===============[ \MongoDB connection ]=============== //

const { isAdmin } = require('./utils/helperMethods');

// =====================[ APP TRANSITION UPDATE METHODS ]======================
/**
 * Updates all the colors with boutique id that we pass to the method
 */
const {
  updateAllColorsWithBoutiqueId,
  updateAllCouriersWithBoutiqueId,
  updateAllSuppliersWithBoutiqueId,
  updateAllCategoriesWithBoutiqueId,
  updateAllUsersWithBoutiqueId,
  updateAllUsersWithFirstTimeSetupField,
  updateAllDressesWithBoutiqueId,
  updateAllPursesWithBoutiqueId,
  updateAllProductDisplayCountersWithBoutiqueId,
  updateAllOrdersWithBoutiqueId,
  updateAllProcessedOrdersForPeriodWithBoutiqueId,
  updateAllBoutiquesWithRequireBuyerImageField,
  ensureVersionDocument,
  createInitialBoutique,
  updateAllUsersWithUiObject,
} = require('./utils/app_transition_data_updates/databaseUpdateMethods');
// ========================[DONE]========================
// createInitialBoutique();
// updateAllUsersWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllColorsWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllCouriersWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllSuppliersWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllCategoriesWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllUsersWithFirstTimeSetupField();
// updateAllDressesWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllPursesWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllProductDisplayCountersWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllOrdersWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllProcessedOrdersForPeriodWithBoutiqueId('690e77a3240e6e923096fd7c');
// updateAllBoutiquesWithRequireBuyerImageField();
// updateAllUsersWithUiObject();
// ========================[DONE]========================

ensureVersionDocument();

// const { updateTotalDressStock, updateTotalPurseStock } = require('./utils/updateAllOnStartup');
// Potrebno je recalc sve total stock
// updateTotalDressStock();
// updateTotalPurseStock();
// =====================[ /APP TRANSITION UPDATE METHODS ]=====================

// =====================[ NODE-CRON SCHEDULERS ]=====================
const startAllSchedulers = require('./schedulers/scheduler');
startAllSchedulers();
// =====================[ \NODE-CRON SCHEDULERS ]=====================

// =====================[ UNPROTECTED ROUTES ]=====================
app.post('/login', authModule.login);
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

// =====================[ ADMIN ROUTE ]======================
const adminRouter = require('./routers/admin');
app.use('/admin', isAdmin, adminRouter);
// =====================[ \ADMIN ROUTE ]=====================

// =====================[ ERROR HANDLERS ]======================
const errorHandler = require('./controllers/errorController');
const { betterErrorLog } = require('./utils/logMethods');
app.use(errorHandler);
// =====================[ \ERROR HANDLERS ]=====================

module.exports = app;
