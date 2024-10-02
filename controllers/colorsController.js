const Color = require('../schemas/color');
const CustomError = require('../utils/CustomError');
const { getSocketInstance } = require('../utils/socket');

// GET Colors
exports.getColors = async(req, res, next) => {
  try{
    const colors = await Color.find();
    res.status(200).json(colors);

  } catch(error){
    console.error(error);
    return next(new CustomError('There was an error while fetching colors', 500));
  }
};

// POST New Color
exports.addColor = async(req, res, next) => {
  try{
    const newColor = new Color(req.body);
    const response = await newColor.save();
    console.log(response)

    // SOCKET HANDLING
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for new color: ', newColor.color);
      io.emit('colorAdded', newColor);
    }

    res.status(200).json({ message: 'Color added successfuly', color: newColor });

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Error adding a new color to the database', statusCode));
  }
}

// DELETE Color
exports.deleteColor = async(req, res, next) => {
  try{
    const { id } = req.params;
    const deletedColor = await Color.findByIdAndDelete(id);
    if(!deletedColor){
      return next(new CustomError('Color not found', 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for color deletion: ', deletedColor.color);
      io.emit('colorRemoved', deletedColor._id);
    }

    res.status(200).json({ message: `Color ${deletedColor.color} deleted successfully`, color: deletedColor });

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Error while deleting the color', statusCode));
  }
}