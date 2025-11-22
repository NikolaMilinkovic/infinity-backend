const Dress = require('../schemas/dress');
const DressColor = require('../schemas/dressColor');
const mongoose = require('mongoose');
const CustomError = require('./CustomError');
const { betterErrorLog, betterConsoleLog } = require('./logMethods');

async function dressColorStockHandler(colorId, sizeId, operation, value = 1, next) {
  try {
    const dressColor = await DressColor.findById(colorId);
    if (!dressColor) {
      return next(new CustomError(`Dress Color objekat nije pronadjen za id ${colorId}`));
    }

    // Find the correct size object
    const sizeToUpdate = dressColor.sizes.find((size) => size._id.toString() === sizeId);
    if (!sizeToUpdate) {
      return next(new CustomError(`Sizer objekat nije pronadjen za id ${sizeId}`));
    }

    // Decrement / Increment based on provided operation
    if (operation === 'decrement') {
      if (sizeToUpdate.stock > 0) {
        sizeToUpdate.stock -= value;
      } else {
        return next(new CustomError(`Nedovoljno zaliha na stanju [${sizeToUpdate.stock}] za size id: ${sizeId}`));
      }
    } else if (operation === 'increment') {
      sizeToUpdate.stock += value;
    } else {
      return next(
        new CustomError(
          `Pogrešan unos za operaciju u dressColorStockHandler [increment | decrement] vaš unos: ${operation}`
        )
      );
    }

    return await dressColor.save();
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode));
  }
}

/**
 * Updates stock for multiple dress sizes and their parent dresses in bulk.
 *
 * @param {Array<Object>} dressesArr - Array of objects with necessary data for dress update.
 * Each object contains:
 *   - dressId: string - The parent dress document ID
 *   - colorId: string - The color ID to update
 *   - sizeId: string - The size ID to update
 *   - increment: number - The amount to increment/decrement stock
 * @param {String} boutiqueId - The boutique this stock belongs to
 * @param {String} operation - 'increment' or 'decrement'
 * @param {Function} next - Callback function for error handling
 * @returns {Promise} - Resolves to true if update succeeds, or calls next with an error
 *
 * Behavior:
 * 1. Updates the stock of each size in `DressColor`.
 * 2. Calculates total delta per parent dress and updates `totalStock` on `Dress`.
 * 3. Handles multiple quantities correctly, summing increments/decrements for the same parent.
 */
async function dressBatchColorStockHandler(dressesArr, boutiqueId, operation, next) {
  try {
    const operations = dressesArr.map((item) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(`${item.colorId}`),
          'sizes._id': new mongoose.Types.ObjectId(`${item.sizeId}`),
        },
        update: { $inc: { 'sizes.$.stock': operation === 'increment' ? item.increment : -item.increment } },
      },
    }));

    await DressColor.collection.bulkWrite(operations);

    // Compute total delta per parent dress
    const totalStockMap = {};
    for (const item of dressesArr) {
      const id = item.dressId;
      const inc = operation === 'increment' ? item.increment : -item.increment;
      totalStockMap[id] = (totalStockMap[id] || 0) + inc;
    }

    // Update totalStock for each parent dress
    const updateOps = Object.entries(totalStockMap).map(([dressId, delta]) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(`${dressId}`),
          boutiqueId: new mongoose.Types.ObjectId(`${boutiqueId}`),
        },
        update: { $inc: { totalStock: delta } },
      },
    }));

    if (updateOps.length > 0) {
      await Dress.collection.bulkWrite(updateOps);
    }

    return true;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating dress batch stock:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja artikala', statusCode));
  }
}

async function updateDressActiveStatus(dressId, boutiqueId) {
  // Check if any color has stock greater than 0
  const dress = await Dress.findOne({ _id: dressId, boutiqueId }).populate('colors');
  if (!dress) {
    throw new Error('Dress not found for id ' + dressId);
  }
  const hasStock = dress.colors.some((color) => color.sizes.some((size) => size.stock > 0));

  // Update the active flag if no stock is available
  if (!hasStock) {
    dress.active = false;

    // Save the changes
    return await dress.save();
  }

  return dress;
}

// async function removeDressById(dressId, boutiqueId, req, next) {
//   try {
//     if (!dressId || !boutiqueId) {
//       throw new Error(`Purse [${dressId}] or Boutique [${boutiqueId}] ID not provided `);
//     }
//     const dress = await Dress.findOne({ _id: dressId, boutiqueId }).populate('colors');
//     if (!dress) {
//       throw new Error('Dress not found for id ' + dressId);
//     }

//     // Delete all DressColors objects from DB
//     for (const colorId of dress.colors) {
//       await DressColor.findByIdAndDelete(colorId);
//     }

//     // Delete the Dress object
//     const deletedDress = await Dress.findOneAndDelete({ _id: dressId, boutiqueId });
//     if (!deletedDress) {
//       return next(new CustomError(`Proizvod sa ID: ${dressId} nije pronađen`, 404));
//     }

//     // SOCKET HANDLING
//     const io = req.app.locals.io;
//     if (io) {
//       if (dress.active) {
//         io.to(`boutique-${boutiqueId}`).emit('activeProductRemoved', deletedDress._id);
//       } else {
//         io.to(`boutique-${boutiqueId}`).emit('inactiveProductRemoved', deletedDress._id);
//       }
//     }

//     return true;
//   } catch (error) {
//     const statusCode = error.statusCode || 500;
//     betterErrorLog('> Error removing a dress via ID:', error);
//     return next(new CustomError('Došlo je do problema prilikom brisanja haljine putem ID-a', statusCode));
//   }
// }

async function removeDressById(dressId, boutiqueId, req, next) {
  try {
    if (!dressId || !boutiqueId) {
      throw new Error(`Dress [${dressId}] or Boutique [${boutiqueId}] ID not provided`);
    }

    // Update the Dress object to isDeleted = true
    const updatedDress = await Dress.findOneAndUpdate(
      { _id: dressId, boutiqueId },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!updatedDress) {
      return next(new CustomError(`Proizvod sa ID: ${dressId} nije pronađen`, 404));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      if (updatedDress.active) {
        io.to(`boutique-${boutiqueId}`).emit('activeProductRemoved', updatedDress._id);
      } else {
        io.to(`boutique-${boutiqueId}`).emit('inactiveProductRemoved', updatedDress._id);
      }
    }

    return true;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating dress via ID:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja haljine putem ID-a', statusCode));
  }
}

module.exports = {
  dressColorStockHandler,
  dressBatchColorStockHandler,
  updateDressActiveStatus,
  removeDressById,
};
