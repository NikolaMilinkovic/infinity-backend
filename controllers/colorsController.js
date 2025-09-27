const Color = require('../schemas/color');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { updateLastUpdatedField } = require('../utils/helperMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

// GET ALL COLORS
exports.getColors = async (req, res, next) => {
  try {
    const colors = await Color.find();
    res.status(200).json(colors);
  } catch (error) {
    betterErrorLog('> Error getting all colors:', error);
    return next(new CustomError('There was an error while fetching colors', 500, req));
  }
};

// ADD NEW COLOR
exports.addColor = async (req, res, next) => {
  try {
    const { color } = req.body;
    const newColor = new Color({
      name: color.name,
      colorCode: '#68e823',
    });

    const addedColor = await newColor.save();
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('colorLastUpdatedAt', io);
      io.emit('colorAdded', newColor);
    }

    res.status(200).json({ message: `${color.name} boja je uspešno dodata`, color: newColor });
    await writeToLog(req, `[COLORS] Added a color [${addedColor._id}] [${addedColor.name}].`);
  } catch (error) {
    // Handle mongo error response
    const mongoErrCode = error?.cause?.code;
    if (error.code === 11000 || mongoErrCode === 11000) {
      return next(
        new CustomError(`${error?.cause?.keyValue?.name} boja već postoji`, 409, req, { color: req.body.color })
      );
    }

    betterErrorLog(`> Error adding a new color:`, error);
    const statusCode = error.statusCode || 500;
    return next(
      new CustomError(`Došlo je do problema prilikom dodavanja boje [${error.code}]`, statusCode, req, {
        color: req.body.color,
      })
    );
  }
};

// UPDATE A COLOR
exports.updateColor = async (req, res, next) => {
  try {
    const { name, colorCode } = req.body;
    const { id } = req.params;
    const updatedColor = await Color.findByIdAndUpdate(id, { name, colorCode }, { new: true });

    // Handle socket update
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('colorLastUpdatedAt', io);
      io.emit('colorUpdated', updatedColor);
    }

    // Optionally, send a response
    res.status(200).json({
      message: `Boja uspešno sačuvana kao ${name}`,
      color: updatedColor,
    });
    await writeToLog(req, `[COLORS] Updated a color [${id}] to [${updatedColor.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a color:', error);
    return next(
      new CustomError('Došlo je do problema prilikom promene boje', statusCode, req, {
        name: req.body.name,
        colorCode: req.body.colorCode,
        id: req.params.id,
      })
    );
  }
};

// DELETE A COLOR
exports.deleteColor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedColor = await Color.findByIdAndDelete(id);
    if (!deletedColor) {
      return next(new CustomError(`Boja sa ID: ${id} nije pronadjena`, 404, req, { id: req.params.id }));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('colorLastUpdatedAt', io);
      io.emit('colorRemoved', deletedColor._id);
    }

    res.status(200).json({ message: `${deletedColor.color} boja je uspešno obrisana`, color: deletedColor });
    await writeToLog(req, `[COLORS] Deleted a color [${deletedColor._id}] [${deletedColor.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a color:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja boje', statusCode, req, { id: req.params.id }));
  }
};
