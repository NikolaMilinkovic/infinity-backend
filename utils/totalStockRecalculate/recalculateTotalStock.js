// scripts/updateTotalStock.js

// !!! SUPER IMPORTANT: OBAVEZNO PRVO KOPIRAJ SVE SLIKE U BACKUP FOLDER !!!

const mongoose = require('mongoose');
const Dress = require('../../schemas/dress');
const DressColor = require('../../schemas/dressColor');
const Purse = require('../../schemas/purse');
const PurseColor = require('../../schemas/purseColor');

async function updateDressStocks() {
  const dresses = await Dress.find().populate('colors');

  for (const dress of dresses) {
    let total = 0;

    for (const color of dress.colors) {
      for (const size of color.sizes) {
        total += size.stock;
      }
    }

    dress.totalStock = total;
    await dress.save();
    console.log(`> Updated Dress ${dress._id} totalStock = ${total}`);
  }
}

async function updatePurseStocks() {
  const purses = await Purse.find().populate('colors');

  for (const purse of purses) {
    let total = 0;

    for (const color of purse.colors) {
      total += color.stock;
    }

    purse.totalStock = total;
    await purse.save();
    console.log(`> Updated Purse ${purse._id} totalStock = ${total}`);
  }
}

async function runUpdateStocks() {
  try {
    await updateDressStocks();
    await updatePurseStocks();
    console.log('✅ All totalStock fields updated!');
  } catch (err) {
    console.error('❌ Error while updating stocks:', err);
  } finally {
    mongoose.connection.close();
  }
}

module.exports = runUpdateStocks;
