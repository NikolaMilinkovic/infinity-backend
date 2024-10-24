const Purse = require('../schemas/purse');
const PurseColor = require('../schemas/purseColor');
const CustomError = require('./CustomError');
const { betterConsoleLog, betterErrorLog } = require('./logMethods');


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


module.exports = {
  purseColorStockHandler,
  updatePurseActiveStatus,
};