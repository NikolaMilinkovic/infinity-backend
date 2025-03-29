const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { decodeUserIdFromToken } = require('../utils/decodeUserIdFromToken');
const User = require('../schemas/user');

exports.getUserData = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);

    res
      .status(200)
      .json({ permissions: user.permissions, settings: user.settings, role: user.role, pushToken: user.pushToken });
  } catch (error) {
    betterErrorLog('> Error while fetching user data:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podataka o korisniku', 500));
  }
};

exports.updateUserSettings = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    user.settings.defaults = req.body.defaults;
    await user.save();
    res.status(200).json({ message: 'Podešavanja uspešno ažurirana' });
  } catch (error) {
    betterErrorLog('> Error while updating user data:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o korisniku', 500));
  }
};

exports.updateUserPushToken = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    const pushToken = JSON.parse(req.body.expoPushToken);
    user.pushToken = pushToken;
    await user.save();
    res.status(200).json({ message: 'Push token uspešno ažuriran' });
  } catch (error) {
    betterErrorLog('> Error while updating user push token:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o push tokenu', 500));
  }
};
