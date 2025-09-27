const CustomError = require('../utils/CustomError');
const { AppSettings } = require('../schemas/appSchema');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { uploadMediaToS3 } = require('../utils/s3/S3DefaultMethods');
const { updateLastUpdatedField } = require('../utils/helperMethods');

exports.getAppSettings = async (req, res, next) => {
  try {
    const appData = await AppSettings.findOne({});
    res.status(200).json({
      message: 'Podešavanja za aplikaciju uspešno preuzeta',
      settings: appData.settings,
      version: appData?.version,
      buildLink: appData?.buildLink || '',
    });
  } catch (error) {
    betterErrorLog('> Error while fetching app settings:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podešavanja za aplikaciju', 500));
  }
};

exports.updateAppSettings = async (req, res, next) => {
  try {
    // Ensure file is present
    if (!req.file) {
      return next(new CustomError('Slika nije prosleđena', 400, req));
    }

    // return betterConsoleLog('> req.file', req.file);
    // Upload image to S3 (goes to root if no path provided)
    const uploadResult = await uploadMediaToS3(req.file, 'clients/infinity_boutique/images/app_icons', next, false);

    const app = await AppSettings.findOne({});
    app.settings.appIcon.appIconUri = uploadResult.uri;
    app.settings.appIcon.appIconName = uploadResult.imageName;

    const updatedAppSettings = await app.save();

    res.status(200).json({
      message: 'Podešavanje aplikacije uspešno ažurirano',
      appIcon: app.settings.appIcon,
    });

    // EMITE EVENT VIA SOCKETS TO UPDATE APP SETTINGS
    const io = req.app.locals.io;
    io.emit('updateAppSettings', updatedAppSettings);
    updateLastUpdatedField('appSchemaLastUpdatedAt', io);
  } catch (error) {
    betterErrorLog('> Error while updating app settings:', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja podešavanja za aplikaciju', 500, req, {
        isFileUploaded: req.file ? true : false,
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: app.file.encoding,
        mimetype: app.file.mimetype,
      })
    );
  }
};
