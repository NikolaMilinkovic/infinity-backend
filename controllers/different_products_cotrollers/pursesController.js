const CustomError = require('../../utils/CustomError');
const Purse = require('../../schemas/purse');
const Boutique = require('../../schemas/boutiqueSchema');
const PurseColor = require('../../schemas/purseColor');
const ProductDisplayCounter = require('../../schemas/productDisplayCounter');
const { uploadMediaToS3 } = require('../../utils/s3/S3DefaultMethods');
const { betterErrorLog } = require('../../utils/logMethods');
const { updateLastUpdatedField, getBoutiqueId } = require('../../utils/helperMethods');
const { writeToLog } = require('../../utils/s3/S3Methods');

// ADD NEW PURSE
exports.addPurse = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { name, category, stockType, price, colors, description, displayPriority, supplier } = req.body;
    let image;
    // Validate data
    if (!name || !category || !stockType || !price || colors.length === 0 || !req.file)
      return next(
        new CustomError(
          'Vrednost za ime, kategoriju, jedinicu asortimana, cenu, boju ili sliku nije pronađena',
          404,
          req,
          {
            name: req.body.name,
            category: req.body.category,
            stockType: req.body.stockType,
            price: req.body.price,
            colors: req.body.colors,
            description: req.body.description,
            supplier: req.body.supplier,
          }
        )
      );

    // Upload to S3
    if (req.file) {
      const boutique_data = await Boutique.findById(boutiqueId);
      image = await uploadMediaToS3(req.file, `clients/${boutique_data.boutiqueName}/images/products`);
    }

    // Parse colors if they are a string
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorsArray.forEach((color) => {
      delete color._id;
    });

    // Add all colors to the database
    const insertedColors = await PurseColor.insertMany(colorsArray);
    const colorIds = insertedColors.map((color) => color._id);
    const counter = await ProductDisplayCounter.findOne({ boutiqueId });

    // Calculate totalStock
    let totalStock = 0;
    for (const color of insertedColors) {
      totalStock += color.stock;
    }

    // Compose new Purse Object
    const newPurse = new Purse({
      boutiqueId,
      name,
      category,
      stockType,
      price,
      colors: colorIds,
      image,
      description,
      displayPriority: counter?.high || 1,
      supplier,
      totalStock,
    });

    counter.high += 1;
    await counter.save();
    const result = await newPurse.save();
    const populatedPurse = await Purse.findOne({ _id: result._id, boutiqueId }).populate('colors');

    // Initiate socket updates
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('purseLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('activeProductAdded', populatedPurse);
    }

    res.status(200).json({ message: `Torbica sa imenom ${name} je uspešno dodata` });
    await writeToLog(req, `[PURSE] Added a new PURSE [${result._id}] [${result.name}] with price [${result.price}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while adding a new product:', error);
    return next(
      new CustomError('Došlo je do problema prilikom dodavanja proizvoda', statusCode, req, {
        name: req.body.name,
        category: req.body.category,
        stockType: req.body.stockType,
        price: req.body.price,
        colors: req.body.colors,
        description: req.body.description,
        supplier: req.body.supplier,
      })
    );
  }
};

exports.getAllActivePurses = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const purses = await Purse.find({ active: true, boutiqueId, isDeleted: false })
      .populate('colors')
      .sort({ displayPriority: -1 });
    res.status(200).json(purses);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while fetching informations about active bags:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja informacija o aktivnim torbicama', statusCode, req)
    );
  }
};

exports.getAllInactivePurses = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const purses = await Purse.find({ active: false, boutiqueId, isDeleted: false })
      .populate('colors')
      .sort({ _id: -1 });
    res.status(200).json(purses);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while fetching informations about inactive bags:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja informacija o neaktivnim torbicama', statusCode, req)
    );
  }
};

exports.deletePurse = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { id } = req.params;
    const purse = await Purse.findOne({ _id: id, boutiqueId });
    if (!purse) {
      return next(new CustomError(`Proizvod sa ID: ${id} nije pronađen`, 404, req, { id: req.params.id }));
    }

    // Delete all PurseColor objects from DB
    for (const colorId of purse.colors) {
      await PurseColor.findByIdAndDelete(colorId);
    }

    // Delete the Purse object
    const deletedPurse = await Purse.findOneAndDelete({ _id: id, boutiqueId });
    if (!deletedPurse) {
      return next(new CustomError(`Proizvod sa ID: ${id} nije pronađen`, 404, req));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      if (purse.active) {
        await updateLastUpdatedField('purseLastUpdatedAt', io, boutiqueId);
        io.to(`boutique-${boutiqueId}`).emit('activeProductRemoved', deletedPurse._id);
      } else {
        await updateLastUpdatedField('purseLastUpdatedAt', io);
        io.to(`boutique-${boutiqueId}`).emit('inactiveProductRemoved', deletedPurse._id);
      }
    }

    res
      .status(200)
      .json({ message: `Proizvod pod imenom ${deletedPurse.name} je uspešno obrisan`, purse: deletedPurse });
    await writeToLog(req, `[PURSE] Deleted a PURSE [${deletedPurse._id}] [${deletedPurse.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while deleting a product:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja proizvoda', statusCode, req, { id: req.params.id })
    );
  }
};
