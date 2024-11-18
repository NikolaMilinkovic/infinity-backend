const Purse = require('../schemas/purse');
const PurseColor = require('../schemas/purseColor');
const CustomError = require('./CustomError');
const mongoose = require('mongoose');
const { betterConsoleLog, betterErrorLog } = require('./logMethods');
const { deleteMediaFromS3 } = require('./s3/S3DefaultMethods');


async function purseColorStockHandler(colorId, operation, value = 1, next){
  try{
    const purseColor = await PurseColor.findById(colorId);
    if(!purseColor){
      return next(new CustomError(`Purse Color objekat nije pronadjen za id ${colorId}`)); 
    }
  
    // Decrement / Increment based on provided operation
    if(operation === 'decrement'){
      if(purseColor.stock > 0){
        purseColor.stock -= value;
      } else {
        return next(new CustomError(`Nedovoljno zaliha na stanju [${purseColor.stock}]`));
      }
    } else if (operation === 'increment'){
      purseColor.stock += value;
    } else {
      return next(new CustomError(`Pogrešan unos za operaciju u purseColorStockHandler [increment | decrement] vaš unos: ${operation}`));
    }
  
    return await purseColor.save();

  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode)); 
  }
}

/**
 * @param {Array<Object>} pursesArr - Array of objects with neccessary data for purse update
 * Each object contains:
 * - orderId: string
 * - colorId: string
 * - increment: number
 * @param {String} operation - can either be increment | decrement 
 * @param {Function} next - callback function for error handling 
 * @returns {Promise} - A promise resolving to the updated stock levels or an error.
 */
async function purseBatchColorStockHandler(pursesArr, operation, next) {
  try {
    const operations = pursesArr.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(`${item.colorId}`) },
        update: { $inc: { stock: operation === 'increment' ? item.increment : -item.increment } }
      }
    }));

    return await PurseColor.collection.bulkWrite(operations);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating purse batch stock:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja artikala', statusCode));
  }
}

async function updatePurseActiveStatus(purseId) {
  // Check if any color has stock greater than 0
  const purse = await Purse.findById(purseId).populate('colors');
  if (!purse) {
    throw new Error('Purse not found for id ' + purseId);
  }
  const hasStock = purse.colors.some(color => color.stock > 0);

  // Update the active flag if no stock is available
  if (!hasStock) {
    console.log('> Setting purse active to false')
    purse.active = false;

    // Save the changes
    return await purse.save();
  }

  return purse;
}

async function removePurseById(purseId){
  const purse = await Purse.findById(purseId).populate('colors');
  if (!purse) {
    throw new Error('Purse not found for id ' + purseId);
  }

      // Delete all DressColors objects from DB
      for (const colorId of purse.colors) {
        await PurseColor.findByIdAndDelete(colorId);
      }
  
      // Delete image from s3 bucket
      await deleteMediaFromS3(purse.image.imageName);

          // Delete the Purse object
    const deletedPurse = await Purse.findByIdAndDelete(purseId);
    if(!deletedPurse){
      return next(new CustomError(`Proizvod sa ID: ${purseId} nije pronađen`, 404));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
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

    return true;
}

module.exports = {
  purseColorStockHandler,
  purseBatchColorStockHandler,
  updatePurseActiveStatus,
  removePurseById
};