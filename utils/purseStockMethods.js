const Purse = require('../schemas/purse');
const PurseColor = require('../schemas/purseColor');
const CustomError = require('./CustomError');
const mongoose = require('mongoose');
const { betterConsoleLog, betterErrorLog } = require('./logMethods');

async function purseColorStockHandler(colorId, operation, value = 1, next) {
  try {
    const purseColor = await PurseColor.findById(colorId);
    if (!purseColor) {
      return next(new CustomError(`Purse Color objekat nije pronadjen za id ${colorId}`));
    }

    // Decrement / Increment based on provided operation
    if (operation === 'decrement') {
      if (purseColor.stock > 0) {
        purseColor.stock -= value;
      } else {
        return next(new CustomError(`Nedovoljno zaliha na stanju [${purseColor.stock}]`));
      }
    } else if (operation === 'increment') {
      purseColor.stock += value;
    } else {
      return next(
        new CustomError(
          `Pogrešan unos za operaciju u purseColorStockHandler [increment | decrement] vaš unos: ${operation}`
        )
      );
    }

    return await purseColor.save();
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode));
  }
}

/**
 * Updates stock for multiple purse colors and their parent purses in bulk.
 *
 * @param {Array<Object>} pursesArr - Array of objects with necessary data for purse update.
 * Each object contains:
 *   - purseId: string - The parent purse document ID
 *   - colorId: string - The specific color ID to update
 *   - increment: number - The amount to increment/decrement stock
 * @param {String} boutiqueId - The boutique this stock belongs to
 * @param {String} operation - 'increment' or 'decrement'
 * @param {Function} next - Callback function for error handling
 * @returns {Promise} - Resolves to true if update succeeds, or calls next with an error
 *
 * Behavior:
 * 1. Updates the stock of each color in `PurseColor` according to the operation and increment.
 * 2. Calculates total delta per parent purse and updates `totalStock` on `Purse`.
 * 3. Handles multiple quantities correctly, summing increments/decrements for the same parent.
 */
async function purseBatchColorStockHandler(pursesArr, boutiqueId, operation, next) {
  try {
    // Update the color amount
    const operations = pursesArr.map((item) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(`${item.colorId}`),
        },
        update: { $inc: { stock: operation === 'increment' ? item.increment : -item.increment } },
      },
    }));

    await PurseColor.collection.bulkWrite(operations);

    // Increment / Decrement totalStock
    const totalStockMap = {};
    for (const item of pursesArr) {
      const id = item.purseId;
      const inc = operation === 'increment' ? item.increment : -item.increment;
      totalStockMap[id] = (totalStockMap[id] || 0) + inc;
    }

    // Update totalStock for each purse
    const updateOps = Object.entries(totalStockMap).map(([purseId, delta]) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(`${purseId}`),
          boutiqueId: new mongoose.Types.ObjectId(`${boutiqueId}`),
        },
        update: { $inc: { totalStock: delta } },
      },
    }));

    if (updateOps.length > 0) {
      await Purse.collection.bulkWrite(updateOps);
    }

    return true;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating purse batch stock:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja artikala', statusCode));
  }
}

async function updatePurseActiveStatus(purseId, boutiqueId) {
  // Check if any color has stock greater than 0
  const purse = await Purse.findOne({ _id: purseId, boutiqueId }).populate('colors');
  if (!purse) {
    throw new Error('Purse not found for id ' + purseId);
  }
  const hasStock = purse.colors.some((color) => color.stock > 0);

  // Update the active flag if no stock is available
  if (!hasStock) {
    purse.active = false;

    // Save the changes
    return await purse.save();
  }

  return purse;
}

// async function removePurseById(purseId, boutiqueId, req, next) {
//   if (!purseId || !boutiqueId) {
//     throw new Error(`Purse [${purseId}] or Boutique [${boutiqueId}] ID not provided `);
//   }
//   const purse = await Purse.findOne({ _id: purseId, boutiqueId }).populate('colors');
//   if (!purse) {
//     throw new Error('Purse not found for id ' + purseId);
//   }

//   // Delete all DressColors objects from DB
//   for (const colorId of purse.colors) {
//     await PurseColor.findByIdAndDelete(colorId);
//   }

//   // Delete the Purse object
//   const deletedPurse = await Purse.findOneAndDelete({ _id: purseId, boutiqueId });
//   if (!deletedPurse) {
//     return next(new CustomError(`Proizvod sa ID: ${purseId} nije pronađen`, 404));
//   }

//   // SOCKET HANDLING
//   const io = req.app.locals.io;
//   if (io) {
//     if (purse.active) {
//       io.to(`boutique-${boutiqueId}`).emit('activeProductRemoved', deletedPurse._id);
//     } else {
//       io.to(`boutique-${boutiqueId}`).emit('inactiveProductRemoved', deletedPurse._id);
//     }
//   }

//   return true;
// }

async function removePurseById(purseId, boutiqueId, req, next) {
  if (!purseId || !boutiqueId) {
    throw new Error(`Purse [${purseId}] or Boutique [${boutiqueId}] ID not provided`);
  }

  // Update the isDeleted flag instead of deleting
  const updatedPurse = await Purse.findOneAndUpdate(
    { _id: purseId, boutiqueId },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!updatedPurse) {
    return next(new CustomError(`Proizvod sa ID: ${purseId} nije pronađen`, 404));
  }

  // SOCKET HANDLING
  const io = req.app.locals.io;
  if (io) {
    if (updatedPurse.active) {
      io.to(`boutique-${boutiqueId}`).emit('activeProductRemoved', updatedPurse._id);
    } else {
      io.to(`boutique-${boutiqueId}`).emit('inactiveProductRemoved', updatedPurse._id);
    }
  }

  return true;
}

module.exports = {
  purseColorStockHandler,
  purseBatchColorStockHandler,
  updatePurseActiveStatus,
  removePurseById,
};
