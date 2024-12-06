const mongoose = require('mongoose');
const Dress = require('../schemas/dress');
const Purse = require('../schemas/purse');

async function updateProductsWithNewFields(){
  try{
    const dressUpdate = await Dress.updateMany(
      { description: {$exists: false}, displayPriority: {$exists: false}, supplier: {$exists: false} },
      { $set: { description: '', displayPriority: 1, supplier: '' } }
    );
    console.log(`Dresses updated: ${dressUpdate.modifiedCount}`);
    const purseUpdate = await Purse.updateMany(
      { description: { $exists: false }, displayPriority: { $exists: false }, supplier: {$exists: false} },
      { $set: { description: '', displayPriority: 1, supplier: '' } }
    );
    console.log(`Purses updated: ${purseUpdate.modifiedCount}`);
  } catch (error){
    console.error('Error updating all products with new fields:', error);
  }
}




module.exports = {
  updateProductsWithNewFields,
}