const CustomError = require('../utils/CustomError');
const Boutique = require('../schemas/boutiqueSchema');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { uploadMediaToS3, deleteMediaFromS3 } = require('../utils/s3/S3DefaultMethods');
const { updateLastUpdatedField, getBoutiqueId } = require('../utils/helperMethods');
const { writeToLog } = require('../utils/s3/S3Methods');
const Version = require('../schemas/version');
const { deepCompareAndUpdate } = require('../utils/compareMethods');

exports.getAppSettings = async (req, res, next) => {
  try {
    const appData = await Boutique.findById(req.user.boutiqueId);
    res.status(200).json({
      message: 'Podešavanja za aplikaciju uspešno preuzeta',
      boutiqueData: appData,
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

    const files = req.files || {};
    let uploadResult;

    // === appIcon_on_white_background ===
    if (files.appIcon_on_white_background && files.appIcon_on_white_background[0]) {
      const file = files.appIcon_on_white_background[0];

      if (
        !app.settings.appIcon_on_white_background ||
        app.settings.appIcon_on_white_background.appIconName !== file.originalname
      ) {
        await deleteMediaFromS3(
          app.settings.appIcon_on_white_background?.appIconName,
          `clients/${app.boutiqueName}/images/app_icons`
        );

        uploadResult = await uploadMediaToS3(file, `clients/${app.boutiqueName}/images/app_icons`, false);

        newSettings.appIcon_on_white_background = {
          appIconUri: uploadResult.uri,
          appIconName: uploadResult.imageName,
        };
      }
    }

    // === appIcon_on_black_background ===
    if (files.appIcon_on_black_background && files.appIcon_on_black_background[0]) {
      const file = files.appIcon_on_black_background[0];

      if (
        !app.settings.appIcon_on_black_background ||
        app.settings.appIcon_on_black_background.appIconName !== file.originalname
      ) {
        await deleteMediaFromS3(
          app.settings.appIcon_on_black_background?.appIconName,
          `clients/${app.boutiqueName}/images/app_icons`
        );

        uploadResult = await uploadMediaToS3(file, `clients/${app.boutiqueName}/images/app_icons`, false);

        newSettings.appIcon_on_black_background = {
          appIconUri: uploadResult.uri,
          appIconName: uploadResult.imageName,
        };
      }
    }

    // === Update merged settings ===
    app.settings = {
      ...app.settings.toObject(),
      ...newSettings,
    };

    const updatedAppSettings = await app.save();

    res.status(200).json({
      message: 'Podešavanje aplikacije uspešno ažurirano',
    });

    const io = req.app.locals.io;
    updateLastUpdatedField('appSchemaLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('updateAppSettings', updatedAppSettings);

    await writeToLog(req, `[APP SETTINGS] Updated app icons.`);
  } catch (error) {
    betterErrorLog('> Error while updating app settings:', error);

    return next(new CustomError('Došlo je do problema prilikom ažuriranja podešavanja za aplikaciju', 500, req));
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

exports.updateBoutiqueData = async (req, res, next) => {
  try {
    const boutiqueId = req.user.boutiqueId;
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) return next(new CustomError('Butik nije pronađen', 404));

    const updatedData = deepCompareAndUpdate(boutique.toObject(), req.body);

    // Save updated fields back into the model
    boutique.set(updatedData);
    const updatedBoutique = await boutique.save();

    const io = req.app.locals.io;
    updateLastUpdatedField('appSchemaLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('updateAppSettings', updatedBoutique);
    io.to('superadmins').emit('boutiquesUpdated', updatedBoutique);

    res.status(200).json({ message: 'Podešavanja butika uspešno ažurirana' });
    await writeToLog(req, `[APP SETTINGS] Updated boutique data.`);
  } catch (error) {
    betterErrorLog('> Error while updating boutique settings:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja podešavanja butika', 500));
  }
};
