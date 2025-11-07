const CustomError = require('../utils/CustomError');
const Boutique = require('../schemas/boutiqueSchema');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { uploadMediaToS3 } = require('../utils/s3/S3DefaultMethods');
const { updateLastUpdatedField, getBoutiqueId } = require('../utils/helperMethods');
const { writeToLog } = require('../utils/s3/S3Methods');
const Version = require('../schemas/version');

exports.getAppSettings = async (req, res, next) => {
  try {
    const appData = await Boutique.findById(req.user.boutiqueId);
    res.status(200).json({
      message: 'Podešavanja za aplikaciju uspešno preuzeta',
      boutiqueData: appData,
      // settings: appData.settings,
      // version: appData?.version,
      // buildLink: appData?.buildLink || '',
      // boutiqueName: appData?.boutiqueName,
    });
  } catch (error) {
    betterErrorLog('> Error while fetching app settings:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja podešavanja za aplikaciju', 500));
  }
};

exports.updateAppSettings = async (req, res, next) => {
  try {
    const newSettings = JSON.parse(req.body.settings);
    const boutiqueId = getBoutiqueId(req);
    const app = await Boutique.findById(boutiqueId);
    if (!app) {
      return next(new CustomError('Podaci o aplikaciji nisu pronađeni.', 400, req));
    }

    // Boutique Icon
    if (req.file && (!app.settings.appIcon || app.settings.appIcon.appIconName !== req.file.originalname)) {
      uploadResult = await uploadMediaToS3(req.file, `clients/${app.boutiqueName}/images/app_icons`, false);
      newSettings.appIcon = {
        appIconUri: uploadResult.uri,
        appIconName: uploadResult.imageName,
      };
    }

    // Other settings
    app.settings = newSettings;
    const updatedAppSettings = await app.save();

    res.status(200).json({
      message: 'Podešavanje aplikacije uspešno ažurirano',
      appIcon: app.settings.appIcon,
    });

    // EMITE EVENT VIA SOCKETS TO UPDATE APP SETTINGS
    const io = req.app.locals.io;
    updateLastUpdatedField('appSchemaLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('updateAppSettings', updatedAppSettings);
    await writeToLog(req, `[APP SETTINGS] Updated boutique icon with [${uploadResult.uri}].`);
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

exports.getAppVersion = async (req, res, next) => {
  try {
    const versionData = await Version.findOne();
    res.status(200).json({
      message: 'Verzija aplikacije uspešno preuzeta',
      versionData: versionData,
    });
  } catch (error) {
    betterErrorLog('> Error while fetching app settings:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja verzije aplikacije.', 500));
  }
};
