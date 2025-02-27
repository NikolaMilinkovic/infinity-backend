const mongoose = require('mongoose');
const Dress = require('../schemas/dress');
const Purse = require('../schemas/purse');
const Users = require('../schemas/user');

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

async function updateAllUsersWithNewFields() {
  try {
    // First, ensure parent objects exist
    const structureUpdates = [
      // First ensure permissions exists
      {
        query: { permissions: { $exists: false } },
        update: { $set: { permissions: {} } }
      },
      // Then ensure settings exists
      {
        query: { settings: { $exists: false } },
        update: { $set: { settings: {} } }
      },
      // Then ensure settings.defaults exists
      {
        query: { "settings.defaults": { $exists: false } },
        update: { $set: { "settings.defaults": {} } }
      }
    ];

    // Then set all the actual values
    const fieldUpdates = [
      // Top level fields
      {
        query: { "permissions": { $exists: true, $eq: {} } },
        update: { $set: { "permissions": {} } }
      },
      // Settings language
      {
        query: { "settings.language": { $exists: false } },
        update: { $set: { "settings.language": "srb" } }
      },
      // Settings defaults
      {
        query: { "settings.defaults.courier": { $exists: false } },
        update: { $set: { "settings.defaults.courier": "Bex" } }
      },
      {
        query: { "settings.defaults.listProductsBy": { $exists: false } },
        update: { $set: { "settings.defaults.listProductsBy": "category" } }
      },
      {
        query: { "settings.defaults.theme": { $exists: false } },
        update: { $set: { "settings.defaults.theme": "light" } }
      }
    ];

    // First ensure all parent structures exist
    for (const update of structureUpdates) {
      const result = await Users.updateMany(update.query, update.update);
      console.log(`Created parent structure for ${Object.keys(update.update.$set)[0]}, modified ${result.modifiedCount} documents`);
    }

    // Then update all the specific fields
    for (const update of fieldUpdates) {
      const result = await Users.updateMany(update.query, update.update);
      console.log(`Updated ${result.modifiedCount} documents for field: ${Object.keys(update.update.$set)[0]}`);
    }

    console.log("All missing user fields updated successfully.");
  } catch(error) {
    console.error('Error updating all users with new fields:', error);
  }
}




module.exports = {
  updateProductsWithNewFields,
  updateAllUsersWithNewFields,
}