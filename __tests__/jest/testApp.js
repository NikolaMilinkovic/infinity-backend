/**
 * Mockup Express app that runs the tests
 * This fill is to be included in every test file like:
 * const app = require('../testApp');
 */

// =======================[ APP ]=======================
const express = require('express');
const authModule = require('../../middleware/authMiddleware')();
const app = express();
app.use(express.json());
app.locals.io = { emit: jest.fn() };
// =======================[ ROUTES ]=======================
app.post('/login', authModule.login);

const userRouter = require('../../routers/user');
app.use('/user', userRouter);

// =======================[ ERROR HANDLER ]=======================
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ message: err.message });
});

module.exports = app;
