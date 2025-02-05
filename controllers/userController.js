const CustomError = require("../utils/CustomError");
const { betterErrorLog } = require("../utils/logMethods");
const { decodeUserIdFromToken } = require('../utils/decodeUserIdFromToken');
const User = require('../schemas/user');

exports.getUserData = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    
    res.status(200).json({ permissions: user.permissions, settings: user.settings });
  } catch (error) {
    betterErrorLog('> Error while fetching user data:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podataka o korisniku', 500));
  }
};