const CustomError = require("../utils/CustomError");
const { AppSettings } = require('../schemas/appSchema');
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");

exports.getAppSettings = async (req, res, next) => {
  try {
    const appData = await AppSettings.findOne({});
    betterConsoleLog('> Logging appData in getAppSettings',appData);
    res.status(200).json({ message: 'Podešavanja za aplikaciju uspešno preuzeta', settings: appData.settings, version: appData?.version, buildLink: appData?.buildLink || '' });
  } catch (error) {
    betterErrorLog('> Error while fetching app settings:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podešavanja za aplikaciju', 500));
  }
};