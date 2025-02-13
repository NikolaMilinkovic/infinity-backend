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

exports.updateUserData = async (req, res, next) => {
  try{
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    // Get the object with new settings
    

    // Traverse each object and update the user settings

    // Save

    // Respond with status 200, ok message
    res.status(200).json({ message: 'Podešavanja usešno ažurirana' });

  } catch (error) {
    betterErrorLog('> Error while updating user data:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podataka o korisniku', 500));
  }
}