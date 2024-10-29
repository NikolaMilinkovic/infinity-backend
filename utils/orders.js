const Order = require('../schemas/order');
const { getSocketInstance } = require('./socket');

/**
 * Removes a single order by its ID.
 * 
 * @param {string} orderId
 * @returns {Promise<Object|null>}
 */
async function removeOrderById(orderId){
  const deletedOrder = await Order.findByIdAndDelete(orderId);
  if(!deletedOrder){
    return next(new CustomError(`Proizvod sa ID: ${dressId} nije pronađen`, 404));
  }

  // SOCKET HANDLING
  const io = getSocketInstance();
  if (io) {
    io.emit('orderRemoved', orderId);
  }

  return deletedOrder;
}

/**
 * Removes a batch of orders by their IDs.
 * 
 * @param {string[]} orderIds
 * @returns {Promise<{ acknowledged: boolean, deletedCount: number }>}
 */
async function removeBatchOrdersById(orderIds){
  const deletedOrders = await Order.deleteMany({_id: { $in: orderIds }})

  // SOCKET HANDLING
  const io = getSocketInstance();
  if (io) {
    io.emit('orderBatchRemoved', orderIds);
  }

  return deletedOrders;
}

module.exports = {
  removeOrderById,
  removeBatchOrdersById
}