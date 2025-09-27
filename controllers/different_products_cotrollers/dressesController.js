const CustomError = require('../../utils/CustomError');
const Dress = require('../../schemas/dress');
const DressColor = require('../../schemas/dressColor');
const { ProductDisplayCounter } = require('../../schemas/productDisplayCounter');
const { uploadMediaToS3 } = require('../../utils/s3/S3DefaultMethods');
const { betterErrorLog } = require('../../utils/logMethods');
const { updateLastUpdatedField } = require('../../utils/helperMethods');
const { writeToLog } = require('../../utils/s3/S3Methods');

// ADD NEW DRESS
exports.addDress = async (req, res, next) => {
  try {
    const { name, category, stockType, price, colors, description, supplier } = req.body;
    let image;
    if (!name || !category || !price || !stockType || colors.length === 0 || !req.file)
      return next(
        new CustomError(
          'Vrednost za ime, kategoriju, jedinicu asortimana, cenu, boju ili sliku nije pronađena',
          404,
          req,
          {
            data: req.body,
          }
        )
      );

    // Upload to S3
    if (req.file) {
      image = await uploadMediaToS3(req.file, 'clients/infinity_boutique/images/products', next);
    }

    // Parse colors if they are a string
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorsArray.forEach((color) => {
      delete color._id;
    });

    const insertedColors = await DressColor.insertMany(colorsArray);
    const colorIds = insertedColors.map((color) => color._id);
    const counter = await ProductDisplayCounter.findOne();

    let totalStock = 0;
    for (const color of insertedColors) {
      for (const sizeObj of color.sizes) {
        totalStock += sizeObj.stock;
      }
    }

    const newDress = new Dress({
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

    const result = await newDress.save();
    const populatedDress = await Dress.findById(result._id).populate('colors');
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('dressLastUpdatedAt', io);
      io.emit('activeDressAdded', populatedDress);
      io.emit('activeProductAdded', populatedDress);
    }

    res.status(200).json({ message: `Haljina sa imenom ${name} je uspešno dodata` });
    await writeToLog(req, `[DRESSES] Added a new DRESS [${result._id}] [${result.name}] with price [${result.price}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a dress:', error);
    return next(
      new CustomError('Došlo je do problema prilikom dodavanja proizvoda', statusCode, req, { body: req.body })
    );
  }
};

// GET ACTIVE DRESSES
exports.getAllActiveDresses = async (req, res, next) => {
  try {
    const dresses = await Dress.find({ active: true }).populate('colors').sort({ displayPriority: -1 });
    res.status(200).json(dresses);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetchuing informations about active dresses:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja informacija o aktivnim haljinama', statusCode, req)
    );
  }
};

// GET INACTIVE DRESSES
exports.getAllInactiveDresses = async (req, res, next) => {
  try {
    const dresses = await Dress.find({ active: false }).populate('colors').sort({ _id: -1 });
    res.status(200).json(dresses);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetchuing informations about inactive dresses:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja informacija o neaktivnim haljinama', statusCode, req)
    );
  }
};

// DELETE A DRESS
exports.deleteDress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dress = await Dress.findById(id);
    if (!dress) {
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404, req));
    }

    // Delete all DressColors objects from DB
    for (const colorId of dress.colors) {
      await DressColor.findByIdAndDelete(colorId);
    }

    // Delete the Dress object
    const deletedDress = await Dress.findByIdAndDelete(id);
    if (!deletedDress) {
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404, req, { id: req.params.id }));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      if (dress.active) {
        io.emit('activeDressRemoved', deletedDress._id);
        io.emit('activeProductRemoved', deletedDress._id);
      } else {
        io.emit('inactiveDressRemoved', deletedDress._id);
        io.emit('inactiveProductRemoved', deletedDress._id);
      }
      await updateLastUpdatedField('dressLastUpdatedAt', io);
    }

    res
      .status(200)
      .json({ message: `Proizvod pod imenom ${deletedDress.name} je uspešno obrisan`, dress: deletedDress });
    await writeToLog(req, `[DRESSES] Deleted a DRESS [${deletedDress._id}] [${deletedDress.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a product:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja brisanja proizvoda', statusCode, req, {
        id: req.params.id,
      })
    );
  }
};
