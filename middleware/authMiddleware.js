const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../schemas/user');
require('dotenv').config();
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');

module.exports = function() {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  // Find user based on userId from the token
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

  /**
   * Authenticates user basd on username & password
   * Generates new token and returns it to the client
   * @returns {
   *  token: string
   *  message: string
   * }
   */
  async function login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (!username) return next(new CustomError('Unesite vas username.', 400));
      if (!password) return next(new CustomError('Unesite vasu sifru.', 400));
      
      const user = await User.findOne({ username: username });
      if (!user) {
        return next(new CustomError('Korisničko ime nije pronađeno, molimo proverite korisničko ime i probajte opet.', 400));
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next(new CustomError('Proverite korisničko ime ili šifru i probajte opet.', 400));
      }

      // Generate JWT token
      const token = generateToken(user._id, 10);
      res.json({ message: 'Uspešno logovanje na sistem.', token });

    } catch (error) {
      betterErrorLog('> Error logging in a user:', error);
      return next(new CustomError("Uh oh.. Server error.. Vreme je da pozovete Milija..", 500));
    }
  }

  const authenticateJWT = passport.authenticate('jwt', { session: false });

  function initializeAuth(app) {
    app.use(passport.initialize());
  }

  /**
   * Generates token based on provided ID and token duration
   * @param {string} id 
   * @param {number} years_duration 
   * @returns {string}
   */
  function generateToken(id, years_duration = 10){
    const token = jwt.sign(
      { userId: id },
      process.env.JWT_SECRET,
      { expiresIn: `${years_duration}y` })
    return token;
  }

  function verifyUser(req, res, next){
    try{
      const { username, password, token } = req.body;
    } catch(error) {
      betterErrorLog('> Error logging in a user:', error);
      return next(new CustomError("Doslo je do problema prilikom verifikacije korisnika.", 401));
    }
  }


  return {
    login,
    authenticateJWT,
    initializeAuth,
    generateToken,
  };
};