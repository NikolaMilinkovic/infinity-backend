const Boutique = require('../schemas/boutiqueSchema');
const ProductDisplayCounter = require('../schemas/productDisplayCounter');
const { LastUpdated } = require('../schemas/lastUpdated');
const { createAdminUserForBoutique } = require('../utils/admin/adminMethods');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { writeToLog } = require('../utils/s3/S3Methods');
const { createTextChannel } = require('../utils/discord/discordClient');

exports.addBoutique = async (req, res, next) => {
  try {
    const { boutiqueData } = req.body;

    // Create boutique
    const boutique = new Boutique({
      boutiqueName: boutiqueData.boutiqueName,
    });

    const newBoutique = await boutique.save();

    // Create LastUpdated document
    const lastUpdated = new LastUpdated({
      boutiqueId: newBoutique._id,
    });
    const savedLastUpdated = await lastUpdated.save();

    // Link LastUpdated to boutique
    newBoutique.lastUpdatedId = savedLastUpdated._id;
    await newBoutique.save();

    // Create new admin user
    await createAdminUserForBoutique(newBoutique);

    // TODO: Create product counter and link it here
    const productDisplayCounter = new ProductDisplayCounter({
      boutiqueId: newBoutique._id,
      high: 1,
      low: 0,
    });
    await productDisplayCounter.save();
    await createTextChannel(boutiqueData.boutiqueName);

    res.status(200).json({
      message: `Butik ${newBoutique.boutiqueName} je uspešno dodat`,
      boutique: newBoutique,
    });

    await writeToLog(req, `[ADMIN] Added a new boutique [${newBoutique._id}] [${newBoutique.boutiqueName}]`);
  } catch (error) {
    betterErrorLog('> Error while adding a new boutique:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja novog butika', 500));
  }
};
