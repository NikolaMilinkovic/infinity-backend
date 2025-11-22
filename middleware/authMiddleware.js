const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../schemas/user');
const Boutique = require('../schemas/boutiqueSchema');
require('dotenv').config();
const CustomError = require('../utils/CustomError');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

module.exports = function () {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    passReqToCallback: true,
  };

  // Find user based on userId from the token
  passport.use(
    new JwtStrategy(opts, async (req, jwt_payload, done) => {
      try {
        // Find user
        const user = await User.findById(jwt_payload.userId);
        if (!user) return done(null, false);

        const boutique = await Boutique.findById(user.boutiqueId);
        if (!user.isSuperAdmin) {
          if (!boutique || boutique.isActive === false) {
            return done(null, false, { message: 'Profile is inactive' });
          }
        }

        // Safely get the token from request
        const tokenFromRequest = req.headers.authorization?.split(' ')[1];
        const deviceType = jwt_payload.deviceType;

        if (!tokenFromRequest) {
          return done(null, false, { message: 'Token missing in request' });
        }

        const session = user.sessions?.[deviceType];
        if (!session || session.token !== tokenFromRequest || session.deviceId !== jwt_payload.deviceId) {
          return done(null, false, { message: 'Sesija istekla ili ste ulogovani na drugom uređaju!' });
        }

        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  /**
   * Authenticates user basd on email & password
   * Generates new token and returns it to the client
   * @returns {
   *  token: string
   *  message: string
   * }
   */
  async function login(req, res, next) {
    try {
      const { email, password, deviceType, deviceId } = req.body;
      betterConsoleLog('> login:', { email: email, password: password, deviceType: deviceType, deviceId: deviceId });
      if (!email) return next(new CustomError('Unesite vaš email.', 400, req, { email: email, password: password }));
      if (!password) return next(new CustomError('Unesite vašu šifru.', 400, req));
      if (!deviceType) return next(new CustomError('DeviceType is missing, please contact support.', 401, req));
      if (!deviceId) return next(new CustomError('DeviceId is missing, please contact support.', 401, req));

      // Fetch user via email
      const user = await User.findOne({ email: email });
      if (!user) {
        return next(
          new CustomError('Email nije pronađen, molimo proverite email i probajte opet.', 400, req, {
            email: email,
            password: password,
          })
        );
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next(
          new CustomError('Proverite email ili šifru i probajte opet.', 400, req, {
            email: email,
            password: password,
          })
        );
      }

      // Check boutique active status
      const boutique_data = await Boutique.findById(user.boutiqueId);
      if (boutique_data.isActive === false && !user.isSuperAdmin) {
        return next(
          new CustomError(
            'Profil je deaktiviran. Kontaktirajte nas na\nnikolamilinkovic221@gmail.com\nza više informacija.',
            403,
            req,
            {
              email: email,
              password: password,
            }
          )
        );
      }

      // Generate JWT token
      const token = generateToken(user._id, deviceType, deviceId, 10);
      if (user && user?.boutiqueId) {
        req.boutiqueName = boutique_data.boutiqueName;
      }

      // Update user session for device type
      const currentSession = user.sessions?.[deviceType];
      user.sessions = user.sessions || { mobile: {}, pc: {} };
      user.sessions[deviceType] = { token, deviceId: req.body.deviceId };
      await user.save();

      res.json({ message: 'Uspešno logovanje na sistem.', token });
      if (token) {
        await writeToLog({}, `[LOGIN] Logged in.`, token);
      }
    } catch (error) {
      const { email, password } = req.body || {};
      betterErrorLog('> Error logging in a user:', error);
      return next(
        new CustomError('Uh oh.. Server error.. Vreme je da pozovete Milija..', 500, req, {
          email: email,
          password: password,
        })
      );
    }
  }

  const authenticateJWT = passport.authenticate('jwt', { session: false });

  function initializeAuth(app) {
    app.use(passport.initialize());
  }

  /**
   * Generates token based on provided ID and token duration
   * @param {string} id
   * @param {string} deviceType
   * @param {string} deviceId
   * @param {number} years_duration
   * @returns {string}
   */
  function generateToken(id, deviceType, deviceId, years_duration = 10) {
    const token = jwt.sign({ userId: id, deviceType, deviceId }, process.env.JWT_SECRET, {
      expiresIn: `${years_duration}y`,
    });
    return token;
  }

  function verifyUser(req, res, next) {
    try {
      const { email, password, token } = req.body;
    } catch (error) {
      betterErrorLog('> Error logging in a user:', error);
      return next(new CustomError('Doslo je do problema prilikom verifikacije korisnika.', 401));
    }
  }

  async function getUserFromToken(token) {
    if (!token) return null;
    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      if (!decoded?.userId) return null;
      return await User.findById(decoded.userId);
    } catch (err) {
      betterErrorLog('Error decoding token in getUserFromToken', err);
      return null;
    }
  }

  return {
    login,
    authenticateJWT,
    initializeAuth,
    generateToken,
    getUserFromToken,
  };
};
