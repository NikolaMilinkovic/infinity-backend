const Dress = require('../schemas/dress');
const DressColor = require('../schemas/dressColor');
const Purse = require('../schemas/purse');
const PurseColor = require('../schemas/purseColor');
const CustomError = require('./CustomError');
const { betterConsoleLog, betterErrorLog } = require('./logMethods');
const { deleteMediaFromS3 } = require('./s3/s3Methods');
const { getSocketInstance } = require('./socket');


async function dressColorStockHandler(colorId, sizeId, operation, value = 1, next){
  try{
    const dressColor = await DressColor.findById(colorId);
    if(!dressColor){
      return next(new CustomError(`Dress Color objekat nije pronadjen za id ${colorId}`)); 
    }
  
    // Find the correct size object
    const sizeToUpdate = dressColor.sizes.find((size) => size._id.toString() === sizeId);
    if(!sizeToUpdate){
      return next(new CustomError(`Sizer objekat nije pronadjen za id ${sizeId}`)); 
    }
  
    // Decrement / Increment based on provided operation
    if(operation === 'decrement'){
      if(sizeToUpdate.stock > 0){
        sizeToUpdate.stock -= value;
      } else {
        return next(new CustomError(`Nedovoljno zaliha na stanju [${sizeToUpdate.stock}] za size id: ${sizeId}`));
      }
    } else if (operation === 'increment'){
      sizeToUpdate.stock += value;
    } else {
      return next(new CustomError(`Pogrešan unos za operaciju u dressColorStockHandler [increment | decrement] vaš unos: ${operation}`));
    }
  
    return await dressColor.save();

  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode)); 
  }
}

async function updateDressActiveStatus(dressId) {
  // Check if any color has stock greater than 0
  const dress = await Dress.findById(dressId).populate('colors');
  if (!dress) {
    throw new Error('Dress not found for id ' + dressId);
  }
  const hasStock = dress.colors.some(color => color.sizes.some(size => size.stock > 0));

  // Update the active flag if no stock is available
  if (!hasStock) {
    console.log('> Setting dress active to false')
    dress.active = false;

    // Save the changes
    return await dress.save();
  }

  return dress;
}


async function removeDressById(dressId){
  const dress = await Dress.findById(dressId).populate('colors');
  if (!dress) {
    throw new Error('Purse not found for id ' + dressId);
  }

      // Delete all DressColors objects from DB
      for (const colorId of dress.colors) {
        await DressColor.findByIdAndDelete(colorId);
      }

      // Delete image from s3 bucket
      await deleteMediaFromS3(dress.image.imageName);

    // Delete the Dress object
    const deletedDress = await Dress.findByIdAndDelete(dressId);
    if(!deletedDress){
      return next(new CustomError(`Proizvod sa ID: ${dressId} nije pronađen`, 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if (io) {
      if (dress.active) {
        console.log('> Deleting an active dress');
        console.log('> Emiting an update to all devices for active dress deletion: ', deletedDress.name);
        io.emit('activeDressRemoved', deletedDress._id);
        io.emit('activeProductRemoved', deletedDress._id);
      } else {
        console.log('> Deleting an inactive dress');
        console.log('> Emiting an update to all devices for inactive dress deletion: ', deletedDress.name);
        io.emit('inactiveDresseRemoved', deletedDress._id);
        io.emit('inactiveProductRemoved', deletedDress._id);
      }
    }

    return true;
}

module.exports = {
  dressColorStockHandler,
  updateDressActiveStatus,
  removeDressById
};