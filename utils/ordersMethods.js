const Order = require('../schemas/order');
const Dress = require('../schemas/dress');
const Purse = require('../schemas/purse');
const DressColor = require('../schemas/dressColor');
const PurseColor = require('../schemas/purseColor');
const CustomError = require('./CustomError');
const { betterConsoleLog, betterErrorLog } = require('./logMethods');
const mongoose = require('mongoose');

/**
 * Removes a single order by its ID.
 *
 * @param {string} orderId
 * @returns {Promise<Object|null>}
 */
async function removeOrderById(orderId, boutiqueId, req) {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderData = await Order.findOne({ _id: orderId, boutiqueId }).session(session);
    if (!orderData) {
      throw new CustomError(`Porudžbina sa ID: ${orderId} nije pronađena`, 404);
    }

    // Arrays to collect updates for different product types
    const dressUpdates = [];
    const purseUpdates = [];

    // Process all products in the order
    for (const item of orderData.products) {
      if (!item.itemReference || !item.selectedColorId) {
        console.warn(`Invalid product data in order ${orderId}`);
        continue;
      }

      const quantity = item.quantity || 1;

      if (item.stockType === 'Boja-Veličina-Količina') {
        // Handle dress stock update
        // const dressItem = await Dress.findById(item.itemReference).session(session);
        const colorItem = await DressColor.findById(item.selectedColorId).populate('sizes').session(session);

        if (!colorItem) {
          throw new CustomError(`DressColorItem sa ID: ${item.selectedColorId} nije pronađen`, 404);
        }

        const size = colorItem.sizes.id(item.selectedSizeId);
        if (!size) {
          throw new CustomError(`Size with ID: ${item.selectedSizeId} not found`, 404);
        }

        size.stock += quantity;
        // dressItem.totalStock += quantity;

        if (size.stock < 0) {
          throw new CustomError(
            `Invalid stock update would result in negative stock for DressColor ${item.selectedColorId} Size ${item.selectedSizeId}`,
            400
          );
        }

        colorItem.markModified('sizes');
        await colorItem.save({ session });
        // await dressItem.save({ session });

        // Collect dress update for socket emission
        dressUpdates.push({
          dressId: item.itemReference,
          colorId: item.selectedColorId,
          sizeId: item.selectedSizeId,
          increment: quantity,
          stockType: item.stockType,
        });
      } else {
        // Handle purse stock update
        // const purseItem = await Purse.findById(item.itemReference).session(session);
        const colorItem = await PurseColor.findById(item.selectedColorId).session(session);
        if (!colorItem) {
          throw new CustomError(`PurseColorItem sa ID: ${item.selectedColorId} nije pronađen`, 404);
        }

        colorItem.stock += quantity;
        // purseItem.totalStock += quantity;

        if (colorItem.stock < 0) {
          throw new CustomError(
            `Invalid stock update would result in negative stock for PurseColor ${item.selectedColorId}`,
            400
          );
        }

        await colorItem.save({ session });
        // await purseItem.save({ session });

        // Collect purse update for socket emission
        purseUpdates.push({
          purseId: item.itemReference,
          colorId: item.selectedColorId,
          increment: quantity,
          stockType: item.stockType,
        });
      }
    }

    // Delete the order
    const deletedOrder = await Order.findOneAndDelete({ _id: orderId, boutiqueId }, { session });

    // Commit transaction
    await session.commitTransaction();

    // SOCKET HANDLING - after successful transaction
    const io = req.app.locals.io;
    if (io) {
      // Emit order removal
      io.to(`boutique-${boutiqueId}`).emit('orderRemoved', orderId);

      // Emit individual dress updates
      dressUpdates.forEach((data) => {
        io.to(`boutique-${boutiqueId}`).emit('allProductStockIncrease', data);
      });

      // Emit individual purse updates
      purseUpdates.forEach((data) => {
        io.to(`boutique-${boutiqueId}`).emit('allProductStockIncrease', data);
      });
    }

    return deletedOrder;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    betterErrorLog('> Error in removeOrderById:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Removes a batch of orders by their IDs.
 *
 * @param {string[]} orderIds
 * @returns {Promise<{ acknowledged: boolean, deletedCount: number }>}
 */
async function removeBatchOrdersById(orderIds, boutiqueId, req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fetchedOrders = await Order.find({
      _id: { $in: orderIds },
      boutiqueId,
    }).session(session);
    if (!fetchedOrders.length) {
      throw new CustomError('No orders found with the provided IDs', 404);
    }

    const dressColorUpdates = new Map();
    const purseColorUpdates = new Map();
    const dressItems = [];
    const purseItems = [];

    // Process orders and collect updates
    for (const order of fetchedOrders) {
      if (!order.products || !order.products.length) {
        console.warn(`Order ${order._id} has no products`);
        continue;
      }

      for (const product of order.products) {
        if (!product.itemReference || !product.selectedColorId) {
          console.warn(`Invalid product data in order ${order._id}`);
          continue;
        }

        if (product.stockType === 'Boja-Veličina-Količina') {
          const dressUpdateData = {
            dressId: product.itemReference,
            colorId: product.selectedColorId,
            sizeId: product.selectedSizeId,
            increment: product.quantity || 1,
          };
          dressItems.push(dressUpdateData);

          const key = `${product.selectedColorId}-${product.selectedSizeId}`;
          if (!dressColorUpdates.has(key)) {
            dressColorUpdates.set(key, {
              colorId: product.selectedColorId,
              sizeId: product.selectedSizeId,
              increment: 0,
            });
          }
          dressColorUpdates.get(key).increment += product.quantity || 1;
        } else {
          const purseUpdateData = {
            purseId: product.itemReference,
            colorId: product.selectedColorId,
            increment: product.quantity || 1,
          };
          purseItems.push(purseUpdateData);

          if (!purseColorUpdates.has(product.selectedColorId)) {
            purseColorUpdates.set(product.selectedColorId, 0);
          }
          purseColorUpdates.set(
            product.selectedColorId,
            purseColorUpdates.get(product.selectedColorId) + (product.quantity || 1)
          );
        }
      }
    }

    // Process dress color updates
    const dressUpdates = await Promise.all(
      Array.from(dressColorUpdates.values()).map(async ({ colorId, sizeId, increment }) => {
        const colorItem = await DressColor.findById(colorId).session(session);
        if (!colorItem) {
          throw new CustomError(`DressColor ${colorId} not found`, 404);
        }

        const size = colorItem.sizes.id(sizeId);
        if (!size) {
          throw new CustomError(`Size ${sizeId} not found in DressColor ${colorId}`, 404);
        }

        size.stock += increment;

        if (size.stock < 0) {
          throw new CustomError(
            `Invalid stock update would result in negative stock for DressColor ${colorId} Size ${sizeId}`,
            400
          );
        }

        colorItem.markModified('sizes');
        return colorItem.save({ session });
      })
    );

    // Process purse color updates
    const purseUpdates = await Promise.all(
      Array.from(purseColorUpdates.entries()).map(async ([colorId, increment]) => {
        const colorItem = await PurseColor.findById(colorId).session(session);
        if (!colorItem) {
          throw new CustomError(`PurseColor ${colorId} not found`, 404);
        }

        colorItem.stock += increment;

        if (colorItem.stock < 0) {
          throw new CustomError(`Invalid stock update would result in negative stock for PurseColor ${colorId}`, 400);
        }

        return colorItem.save({ session });
      })
    );

    // Dresses
    // const uniqueDressIncrements = new Map();
    // for (const d of dressItems) {
    //   if (!uniqueDressIncrements.has(d.dressId)) {
    //     uniqueDressIncrements.set(d.dressId, 0);
    //   }
    //   uniqueDressIncrements.set(d.dressId, uniqueDressIncrements.get(d.dressId) + d.increment);
    // }

    // for (const [dressId, increment] of uniqueDressIncrements.entries()) {
    //   await Dress.findByIdAndUpdate(dressId, { $inc: { totalStock: increment } }, { session });
    // }

    // // Purses
    // const uniquePurseIncrements = new Map();
    // for (const p of purseItems) {
    //   if (!uniquePurseIncrements.has(p.purseId)) {
    //     uniquePurseIncrements.set(p.purseId, 0);
    //   }
    //   uniquePurseIncrements.set(p.purseId, uniquePurseIncrements.get(p.purseId) + p.increment);
    // }

    // for (const [purseId, increment] of uniquePurseIncrements.entries()) {
    //   await Purse.findByIdAndUpdate(purseId, { $inc: { totalStock: increment } }, { session });
    // }

    // Delete orders
    const deletedOrders = await Order.deleteMany({ _id: { $in: orderIds }, boutiqueId }, { session });

    // Commit transaction
    await session.commitTransaction();

    // Emit socket events for updates
    const data = { dresses: dressItems, purses: purseItems };
    const io = req.app.locals.io;
    if (io) {
      io.to(`boutique-${boutiqueId}`).emit('orderBatchRemoved', orderIds);
      io.to(`boutique-${boutiqueId}`).emit('batchStockIncrease', data);
    }

    return deletedOrders;
  } catch (error) {
    // If there's an error, rollback the transaction
    await session.abortTransaction();
    betterErrorLog('> Error during purse batch deletion:', error);
    throw error;
  } finally {
    // End the session
    session.endSession();
  }
}

module.exports = {
  removeOrderById,
  removeBatchOrdersById,
};
