const Color = require('../schemas/color');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { getSocketInstance } = require('../utils/socket');


// GET ALL COLORS
exports.getColors = async(req, res, next) => {
  try{
    const colors = await Color.find();
    res.status(200).json(colors);
  } catch(error){
    betterErrorLog('> Error getting all colors:', error);
    return next(new CustomError('There was an error while fetching colors', 500));
  }
}

// ADD NEW COLOR
exports.addColor = async(req, res, next) => {
  try{
    const { color } = req.body;
    const newColor = new Color({
      name: color.name,
      colorCode: '#68e823'
    })

    const response = await newColor.save();
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for new color: ', newColor.name);
      io.emit('colorAdded', newColor);
    }
  
    res.status(200).json({ message: `${color.name} boja je uspesno dodata`, color: newColor });
  } catch(error){
    if (error.code === 11000) {
      return next(new CustomError(`${error.keyValue.name} boja vec postoji`, 409));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new color:', error);
    return next(new CustomError('Doslo je do problema prilikom dodavanja boje', statusCode));
  }
}

// UPDATE A COLOR
exports.updateColor = async(req, res, next) => {
  try{
    const { name, colorCode } = req.body;
    const { id } = req.params;
    const updatedColor = await Color.findByIdAndUpdate(
      id,
      { name, colorCode },
      { new: true }
    );

    // Handle socket update
    const io = getSocketInstance();
    if (io) {
      console.log('> Emitting an update to all devices for color update: ', updatedColor.name);
      io.emit('colorUpdated', updatedColor);
    }

    // Optionally, send a response
    res.status(200).json({
      message: `Boja uspesno sacuvana kao ${name}`,
      color: updatedColor,
    });
  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a color:', error);
    return next(new CustomError('Doslo je do problema prilikom promene boje', statusCode));
  }
}

// DELETE A COLOR
exports.deleteColor = async(req, res, next) => {
  try{
    const { id } = req.params;
    const deletedColor = await Color.findByIdAndDelete(id);
    if(!deletedColor){
      return next(new CustomError(`Boja sa ID: ${id} nije pronadjena`, 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for color deletion: ', deletedColor.name);
      io.emit('colorRemoved', deletedColor._id);
    }

    res.status(200).json({ message: `${deletedColor.color} boja je uspesno obrisana`, color: deletedColor });

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a color:', error);
    return next(new CustomError('Doslo je do problema prilikom brisanja boje', statusCode));
  }
}