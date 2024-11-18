const CustomError = require("../../utils/CustomError");
const Purse = require('../../schemas/purse');
const { getSocketInstance } = require('../../utils/socket');
const PurseColor = require('../../schemas/purseColor');
const { uploadMediaToS3, deleteMediaFromS3 } = require("../../utils/s3/S3DefaultMethods");
const { betterErrorLog, betterConsoleLog } = require("../../utils/logMethods");

// ADD NEW PURSE
exports.addPurse = async (req, res, next) => {
  try{
    const { name, category, stockType, price, colors } = req.body;
    let image;
    // Validate data
    if (!name || !category || !stockType || !price || colors.length === 0 || !req.file)
      return next(new CustomError('Vrednost za ime, kategoriju, jedinicu asortimana, cenu, boju ili sliku nije pronađena', 404));

    // Upload to S3
    if(req.file){
      console.log('> Starting upload to S3')
      image = await uploadMediaToS3(req.file, next);
      betterConsoleLog('> Upload to S3 completed', image);
    }

    // Parse colors if they are a string
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorsArray.forEach(color => {
      delete color._id
    });

    // Add all colors to the database
    const insertedColors = await PurseColor.insertMany(colorsArray);
    const colorIds = insertedColors.map((color) => color._id);

    // Compose new Purse Object
    const newPurse = new Purse({
      name,
      category,
      stockType,
      price,
      colors: colorIds,
      image
    });
    const result = await newPurse.save();
    const populatedPurse = await Purse.findById(result._id).populate('colors');

    // Initiate socket updates
    const io = getSocketInstance();
    if(io) {
      betterConsoleLog(`> Emiting update to all devices for new purse ${populatedPurse.name}`, populatedPurse);
      io.emit('activePurseAdded', populatedPurse);
      io.emit('activeProductAdded', populatedPurse);
    }

    res.status(200).json({ message: `Torbica sa imenom ${name} je uspešno dodata` });

  } catch (error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error Adding a purse:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja proizvoda', statusCode));    
  }
}

exports.getAllActivePurses = async(req, res, next) => {
  try{
    const purses = await Purse.find({ active: true }).populate('colors');
    res.status(200).json(purses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error getting active purses:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o aktivnim torbicama', statusCode));  
  }
}

exports.getAllInactivePurses = async(req, res, next) => {
  try{
    const purses = await Purse.find({ active: false }).populate('colors');
    res.status(200).json(purses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error getting active purses:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o neaktivnim torbicama', statusCode));  
  }
}

exports.deletePurse = async(req, res, next) => {
  try{
    const { id } = req.params;
    const purse = await Purse.findById(id);
    if(!purse){
      return next(new CustomError(`Proizvod sa ID: ${id} nije pronađen`, 404));
    }

    // Delete all PurseColor objects from DB
    for (const colorId of purse.colors) {
      await PurseColor.findByIdAndDelete(colorId);
    }

    // Delete image from s3 bucket
    await deleteMediaFromS3(purse.image.imageName);

    // Delete the Purse object
    const deletedPurse = await Purse.findByIdAndDelete(id);
    if(!deletedPurse){
      return next(new CustomError(`Proizvod sa ID: ${id} nije pronađen`, 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if (io) {
      if (purse.active) {
        console.log('> Deleting an active purse');
        console.log('> Emiting an update to all devices for active purse deletion: ', deletedPurse.name);
        io.emit('activePurseRemoved', deletedPurse._id);
        io.emit('activeProductRemoved', deletedPurse._id);
      } else {
        console.log('> Deleting an inactive purse');
        console.log('> Emiting an update to all devices for inactive purse deletion: ', deletedPurse.name);
        io.emit('inactivePurseRemoved', deletedPurse._id);
        io.emit('inactiveProductRemoved', deletedPurse._id);
      }
    }


    res.status(200).json({ message: `Proizvod pod imenom ${deletedPurse.name} je uspešno obrisan`, purse: deletedPurse });

  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a purse:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja proizvoda', statusCode)); 
  }
}