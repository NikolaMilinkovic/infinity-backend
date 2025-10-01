const CustomError = require('../utils/CustomError');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { decodeUserIdFromToken } = require('../utils/decodeUserIdFromToken');
const User = require('../schemas/user');
const bcrypt = require('bcryptjs');
const { addLogFileForNewUser, renameUserLogFile } = require('../utils/s3/S3Methods');
const { writeToLog } = require('../utils/s3/S3Methods');

exports.getUserData = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    let usersList = [];
    if (user.role === 'admin' && user.permissions.navigation.upravljanje_korisnicima) {
      usersList = await User.find();
    }

    res.status(200).json({
      permissions: user.permissions,
      settings: user.settings,
      role: user.role,
      pushToken: user.pushToken,
      usersList: usersList,
    });
  } catch (error) {
    betterErrorLog('> Error while fetching user data:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja podataka o korisniku', 500, req, {
        userId: req.headers.authorization,
      })
    );
  }
};

exports.addUser = async (req, res, next) => {
  try {
    const userData = req.body.user;
    const username = userData.username;
    const name = userData.name;
    const password = userData.password;
    const role = userData.role;
    const permissions = userData.permissions;
    const existingUser = await User.findOne({ username });
    const pushToken = '';

    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({
        username,
        name,
        password: hashedPassword,
        role,
        pushToken,
        permissions,
        settings: {
          courier: '',
          listProductsBy: 'category',
          language: 'srb',
        },
      });

      const addedUser = await newUser.save();
      await addLogFileForNewUser(addedUser);

      const io = req.app.locals.io;
      io.emit('addUser', addedUser);
      res.status(200).json({ message: 'Korisnik uspešno dodat' });
      await writeToLog(req, `[USERS] Added a new user ${addedUser._id} | ${addedUser.username}.`);
    } else {
      return next(new CustomError('Korisnik sa tim korisničkim imenom već postoji!', 500, req));
    }
  } catch (error) {
    betterErrorLog('> Error while adding a new user:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja novog korisnika', 500, req));
  }
};

exports.updateUserSettings = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    user.settings.defaults = req.body.defaults;
    await user.save();
    res.status(200).json({ message: 'Podešavanja uspešno ažurirana' });
    await writeToLog(req, `[USERS] Updated his user settings.`);
  } catch (error) {
    betterErrorLog('> Error while updating user data:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o korisniku', 500, req));
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const userData = req.body.user;
    betterConsoleLog('> User data: ', userData);
    const user = await User.findById(userData._id);
    if (user) {
      let hashedPassword;
      if (user.password !== userData.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(userData.password, salt);
        user.password = hashedPassword;
      }
      if (user.username !== userData.username) {
        await renameUserLogFile(user._id, user.username, userData.username);
        user.username = userData.username;
      }
      if (user.name !== userData.name) user.name = userData.name;
      if (user.role !== userData.role) user.role = userData.role;
      user.permissions = userData.permissions;

      const updatedUser = await user.save();
      const authHeader = req.headers['authorization'];
      const receivedToken = authHeader && authHeader.split(' ')[1];
      const io = req.app.locals.io;
      io.emit('updateUser', updatedUser, receivedToken);
      res.status(200).json({ message: 'Korisnik uspešno ažuriran' });

      await writeToLog(req, `[USERS] Updated a user [${user._id}] with username: [${user.username}].`);
    } else {
      return next(new CustomError('Korisnik nije pronađen u bazi podataka', 500, req));
    }
  } catch (error) {
    betterErrorLog('> Error while updating user:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o korisniku', 500, req));
  }
};

exports.removeUser = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const deletedUser = await User.findOneAndDelete({ _id: userId });

    if (!deletedUser) {
      return res.status(404).json({ message: 'ERROR: Korisnik nije pronađen' });
    }
    const io = req.app.locals.io;
    io.emit('removeUser', userId);
    res.status(200).json({ message: 'Korisnik je uspešno obrisan' });

    await writeToLog(req, `[USERS] Removed a user [${deletedUser._id}] with username: [${deletedUser.username}].`);
  } catch (error) {
    betterErrorLog('> Error while updating user data:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o korisniku', 500, req));
  }
};

exports.updateUserPushToken = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    const pushToken = req.body.expoPushToken;
    console.log('> Received push token:', pushToken);

    user.pushToken = pushToken;
    await user.save();

    res.status(200).json({ message: 'Push token uspešno ažuriran' });
    await writeToLog(req, `[USERS] User [${userId}] updated his expo push token to [${pushToken}].`);
  } catch (error) {
    betterErrorLog('> Error while updating user push token:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o push tokenu', 500, req));
  }
};
