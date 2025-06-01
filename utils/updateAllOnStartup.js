const mongoose = require('mongoose');
const Dress = require('../schemas/dress');
const Purse = require('../schemas/purse');
const Users = require('../schemas/user');

async function updateProductsWithNewFields() {
  try {
    const dressUpdate = await Dress.updateMany(
      { description: { $exists: false }, displayPriority: { $exists: false }, supplier: { $exists: false } },
      { $set: { description: '', displayPriority: 1, supplier: '' } }
    );
    console.log(`Dresses updated: ${dressUpdate.modifiedCount}`);
    const purseUpdate = await Purse.updateMany(
      { description: { $exists: false }, displayPriority: { $exists: false }, supplier: { $exists: false } },
      { $set: { description: '', displayPriority: 1, supplier: '' } }
    );
    console.log(`Purses updated: ${purseUpdate.modifiedCount}`);
  } catch (error) {
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
        update: { $set: { permissions: {} } },
      },
      // Then ensure settings exists
      {
        query: { settings: { $exists: false } },
        update: { $set: { settings: {} } },
      },
      // Then ensure settings.defaults exists
      {
        query: { 'settings.defaults': { $exists: false } },
        update: { $set: { 'settings.defaults': {} } },
      },
    ];

    // Then set all the actual values
    const fieldUpdates = [
      // Top level fields
      {
        query: { permissions: { $exists: true, $eq: {} } },
        update: { $set: { permissions: {} } },
      },
      // Settings language
      {
        query: { 'settings.language': { $exists: false } },
        update: { $set: { 'settings.language': 'srb' } },
      },
      // Settings defaults
      {
        query: { 'settings.defaults.courier': { $exists: false } },
        update: { $set: { 'settings.defaults.courier': 'Bex' } },
      },
      {
        query: { 'settings.defaults.listProductsBy': { $exists: false } },
        update: { $set: { 'settings.defaults.listProductsBy': 'category' } },
      },
      {
        query: { 'settings.defaults.theme': { $exists: false } },
        update: { $set: { 'settings.defaults.theme': 'light' } },
      },
      {
        query: { pushToken: { $exists: false } },
        update: { $set: { pushToken: '' } },
      },
    ];

    // First ensure all parent structures exist
    for (const update of structureUpdates) {
      const result = await Users.updateMany(update.query, update.update);
      console.log(
        `Created parent structure for ${Object.keys(update.update.$set)[0]}, modified ${result.modifiedCount} documents`
      );
    }

    // Then update all the specific fields
    for (const update of fieldUpdates) {
      const result = await Users.updateMany(update.query, update.update);
      console.log(`Updated ${result.modifiedCount} documents for field: ${Object.keys(update.update.$set)[0]}`);
    }

    console.log('All missing user fields updated successfully.');
  } catch (error) {
    console.error('Error updating all users with new fields:', error);
  }
}

async function updateTotalDressStock() {
  try {
    // Step 1: Get all dresses with their colors populated
    const dresses = await Dress.find().populate('colors');

    // Step 2: For each dress, calculate total stock and update
    for (const dress of dresses) {
      let totalStock = 0;

      // Sum up stock from all colors and their sizes
      for (const color of dress.colors) {
        for (const sizeObj of color.sizes) {
          totalStock += sizeObj.stock;
        }
      }

      // Update the dress with the calculated total stock
      await Dress.updateOne({ _id: dress._id }, { $set: { totalStock: totalStock } });
    }

    console.log('All dress total stock values updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating total dress stock:', error);
    throw error;
  }
}

async function updateTotalPurseStock() {
  try {
    // Step 1: Get all dresses with their colors populated
    const purses = await Purse.find().populate('colors');

    // Step 2: For each dress, calculate total stock and update
    for (const purse of purses) {
      let totalStock = 0;

      // Sum up stock from all colors and their sizes
      for (const color of purse.colors) {
        totalStock += color.stock;
      }

      // Update the dress with the calculated total stock
      await Purse.updateOne({ _id: purse._id }, { $set: { totalStock: totalStock } });
    }

    console.log('All purse total stock values updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating total purse stock:', error);
    throw error;
  }
}

module.exports = {
  updateProductsWithNewFields,
  updateAllUsersWithNewFields,
  updateTotalDressStock,
  updateTotalPurseStock,
};
