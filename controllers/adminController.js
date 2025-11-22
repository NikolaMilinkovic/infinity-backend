const Boutique = require('../schemas/boutiqueSchema');
const User = require('../schemas/user');
const ProductDisplayCounter = require('../schemas/productDisplayCounter');
const { LastUpdated } = require('../schemas/lastUpdated');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { writeToLog } = require('../utils/s3/S3Methods');
const { createTextChannel } = require('../utils/discord/discordClient');
const { decodeUserIdFromToken } = require('../utils/decodeUserIdFromToken');
const { getBoutiqueId } = require('../utils/helperMethods');

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

exports.getBoutiqueUsers = async (req, res, next) => {
  try {
    const userId = decodeUserIdFromToken(req.headers.authorization);
    const user = await User.findById(userId);
    let usersList = [];
    const boutiqueId = getBoutiqueId(req);
    if (user.role === 'admin' && user.permissions.navigation.upravljanje_korisnicima) {
      usersList = await User.find({
        boutiqueId,
        isSuperAdmin: false,
      });
    } else if (user.role === 'admin' && user.permissions.navigation.upravljanje_korisnicima && user.isSuperAdmin) {
      usersList = await User.find({ boutiqueId });
    }

    res.status(200).json({
      usersList: usersList,
    });
  } catch (error) {
    betterErrorLog('> Error while fetching boutique users data:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja podataka o korisnicima butika', 500, req, {
        userId: req.headers.authorization,
      })
    );
  }
};

exports.getBoutiques = async (req, res, next) => {
  try {
    const boutiques = await Boutique.find({}, '_id boutiqueName isActive');
    const boutiqueId = getBoutiqueId(req);

    boutiques.sort((a, b) => {
      if (a._id.equals(boutiqueId)) return -1;
      if (b._id.equals(boutiqueId)) return 1;
      return 0;
    });

    res.status(200).json({ boutiques });
  } catch (error) {
    betterErrorLog('> Error while fetching boutiques data:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja podataka o buticima', 500, req, {
        userId: req.headers.authorization,
      })
    );
  }
};

exports.changeBoutique = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(404).json({ message: 'ID butika je neophodan!' });
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { boutiqueId: id }, { new: true });

    res.status(200).json({ message: 'Postali ste korisnik izabranog butika' });
    await writeToLog(req, `[ADMIN] Switched to boutique [${updatedUser.boutiqueId}]`);
  } catch (error) {
    betterErrorLog('> Error while updating boutiqueId:', error);
    return next(
      new CustomError('Došlo je do problema prilikom izmene boutiqueId', 500, req, {
        userId: req.user._id,
        boutiqueId: req.params,
      })
    );
  }
};
