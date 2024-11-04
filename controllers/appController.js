const CustomError = require("../utils/CustomError");
const { AppSettings } = require('../schemas/appSchema');
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");

exports.getAppSettings = async (req, res, next) => {
  try {
    const appData = await AppSettings.findOne({}, 'settings');
    res.status(200).json({ message: 'Podešavanja za aplikaciju uspešno preuzeta', settings: appData.settings });
  } catch (error) {
    betterErrorLog('Error in getAppSettings:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podešavanja za aplikaciju', 500));
  }
};