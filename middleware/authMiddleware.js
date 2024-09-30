const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../schemas/user');
require('dotenv').config();
const CustomError = require('../utils/CustomError');

module.exports = function() {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.userId);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  }));

  async function login(req, res, next) {
    try {
      const { username, password } = req.body;
      // if(!username) return res.status(400).json({ message: 'Please provide a username' });
      // if(!password) return res.status(400).json({ message: 'Please provide a password' });
      if (!username) return next(new CustomError('Please provide a username', 400));
      if (!password) return next(new CustomError('Please provide a password', 400));
      const user = await User.findOne({ username: username });
      
      if (!user) {
        return next(new CustomError('User not found, please check your username and try again.', 400));
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return next(new CustomError('Invalid credentials.', 400));
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '10y' }
      );

      res.json({ message: 'Login successful', token });
    } catch (error) {
      console.error(error);
      return next(new CustomError("Server error, it's time to call Nick..", 500));
    }
  }

  const authenticateJWT = passport.authenticate('jwt', { session: false });

  function initializeAuth(app) {
    app.use(passport.initialize());
  }

  function generateToken(id, years_duration = 10){
    const token = jwt.sign(
      { userId: id },
      process.env.JWT_SECRET,
      { expiresIn: `${years_duration}y` })
    return token;
  }

  return {
    login,
    authenticateJWT,
    initializeAuth,
    generateToken
  };
};