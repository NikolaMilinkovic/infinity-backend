const CustomError = require("../../utils/CustomError");
const Dress = require("../../schemas/dress");
const DressColor = require("../../schemas/dressColor");
const { uploadMediaToS3, deleteMediaFromS3 } = require("../../utils/s3/S3DefaultMethods");
const { betterErrorLog, betterConsoleLog } = require("../../utils/logMethods");

// ADD NEW DRESS
exports.addDress = async (req, res, next) => {
  try {
    const { name, category, stockType, price, colors } = req.body;
    let image;
    if (!name || !category || !price || !stockType || colors.length === 0 || !req.file)
      return next(new CustomError('Vrednost za ime, kategoriju, jedinicu asortimana, cenu, boju ili sliku nije pronađena', 404));

    // Upload to S3
    if (req.file) {
      image = await uploadMediaToS3(req.file, next);
    }

    // Parse colors if they are a string
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorsArray.forEach(color => {
      delete color._id
    });

    const insertedColors = await DressColor.insertMany(colorsArray);
    const colorIds = insertedColors.map((color) => color._id);

    const newDress = new Dress({
      name,
      category,
      stockType,
      price,
      colors: colorIds,
      image
    });

    const result = await newDress.save();
    const populatedDress = await Dress.findById(result._id).populate('colors');
    const io = req.app.locals.io;
    if(io) {
      betterConsoleLog(`> Logging out the newly added dress ${populatedDress.name}`, populatedDress);
      io.emit('activeDressAdded', populatedDress);
      io.emit('activeProductAdded', populatedDress);
    }

    res.status(200).json({ message: `Haljina sa imenom ${name} je uspešno dodata` });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error Adding a dress:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja proizvoda', statusCode));
  }
}

// GET ACTIVE DRESSES
exports.getAllActiveDresses = async(req, res, next) => {
  try{
    const dresses = await Dress.find({ active: true }).populate('colors');
    res.status(200).json(dresses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error getting active dresses:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o aktivnim haljinama', statusCode));  
  }
};

// GET INACTIVE DRESSES
exports.getAllInactiveDresses = async(req, res, next) => {
  try{
    const dresses = await Dress.find({ active: false }).populate('colors');
    res.status(200).json(dresses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error getting inactive dresses:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o neaktivnim haljinama', statusCode));    
  }
};

// DELETE A DRESS
exports.deleteDress = async(req, res, next) => {
  try{
    const { id } = req.params;
    const dress = await Dress.findById(id);
    if(!dress){
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404));
    }

    // Delete all DressColors objects from DB
    for (const colorId of dress.colors) {
      await DressColor.findByIdAndDelete(colorId);
    }

    // Delete image from s3 bucket
    await deleteMediaFromS3(dress.image.imageName);

    // Delete the Dress object
    const deletedDress = await Dress.findByIdAndDelete(id);
    if(!deletedDress){
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      if (dress.active) {
        console.log('> Deleting an active dress');
        console.log('> Emiting an update to all devices for active dress deletion: ', deletedDress.name);
        io.emit('activeDressRemoved', deletedDress._id);
        io.emit('activeProductRemoved', deletedDress._id);
      } else {
        console.log('> Deleting an inactive dress');
        console.log('> Emiting an update to all devices for inactive dress deletion: ', deletedDress.name);
        io.emit('inactiveDressRemoved', deletedDress._id);
        io.emit('inactiveProductRemoved', deletedDress._id);
      }
    }


    res.status(200).json({ message: `Proizvod pod imenom ${deletedDress.name} je uspešno obrisan`, dress: deletedDress });

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a dress:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja brisanja proizvoda', statusCode)); 
  }
}