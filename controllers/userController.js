const CustomError = require('../utils/CustomError');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { decodeUserIdFromToken } = require('../utils/decodeUserIdFromToken');
const User = require('../schemas/user');
const Boutique = require('../schemas/boutiqueSchema');
const bcrypt = require('bcryptjs');
const { addLogFileForNewUser, renameUserLogFile } = require('../utils/s3/S3Methods');
const { writeToLog } = require('../utils/s3/S3Methods');
const { getBoutiqueId, updateLastUpdatedField } = require('../utils/helperMethods');

exports.getUserData = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);

    res.status(200).json({
      user: user,
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
    const boutiqueId = getBoutiqueId(req);
    const user_boutique = await Boutique.findById(boutiqueId);

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
        boutiqueId,
      });

      const addedUser = await newUser.save();
      await addLogFileForNewUser(addedUser, user_boutique.boutiqueName);

      const io = req.app.locals.io;
      await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('addUser', addedUser);
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
    const boutiqueId = getBoutiqueId(req);
    const user = await User.findOne({ _id: userId, boutiqueId });
    user.settings = req.body.settings;
    await user.save();
    const io = req.app.locals.io;
    await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
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
    const boutiqueId = getBoutiqueId(req);
    const user = await User.findOne({ _id: userData._id, boutiqueId });
    if (user) {
      let hashedPassword;
      if (user.password !== userData.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(userData.password, salt);
        user.password = hashedPassword;
      }
      if (user.username !== userData.username) {
        const user_boutique = await Boutique.findById(userData.boutiqueId);
        await renameUserLogFile(user._id, user.username, userData.username, user_boutique.boutiqueName);
        user.username = userData.username;
      }
      if (user.name !== userData.name) user.name = userData.name;
      if (user.role !== userData.role) user.role = userData.role;
      user.permissions = userData.permissions;

      const updatedUser = await user.save();
      const authHeader = req.headers['authorization'];
      const receivedToken = authHeader && authHeader.split(' ')[1];
      const io = req.app.locals.io;
      await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('updateUser', updatedUser, receivedToken);
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
    const boutiqueId = getBoutiqueId(req);
    const deletedUser = await User.findOneAndDelete({ _id: userId, boutiqueId });
    if (!deletedUser) {
      return res.status(404).json({ message: 'ERROR: Korisnik nije pronađen' });
    }
    const io = req.app.locals.io;
    await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('removeUser', userId);
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
    const boutiqueId = getBoutiqueId(req);
    const user = await User.findOne({ _id: userId, boutiqueId });
    const pushToken = req.body.expoPushToken;
    user.pushToken = pushToken;
    await user.save();
    const io = req.app.locals.io;
    await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
    res.status(200).json({ message: 'Push token uspešno ažuriran' });
    await writeToLog(req, `[USERS] User [${userId}] updated his expo push token to [${pushToken}].`);
  } catch (error) {
    betterErrorLog('> Error while updating user push token:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o push tokenu', 500, req));
  }
};

exports.resetUserPushToken = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const boutiqueId = getBoutiqueId(req);
    const user = await User.findOne({ _id: userId, boutiqueId });
    user.pushToken = '';
    await user.save();
    const io = req.app.locals.io;
    await updateLastUpdatedField('userLastUpdatedAt', io, boutiqueId);
    res.status(200).json({ message: 'Push token reset successfully' });
    await writeToLog(req, `[USERS] User [${userId}] reset his push token upon logout.`);
  } catch (error) {
    betterErrorLog('> Error while resetting user push token:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o push tokenu', 500, req));
  }
};
