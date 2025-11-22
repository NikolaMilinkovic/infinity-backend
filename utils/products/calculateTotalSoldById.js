const mongoose = require('mongoose');
const Order = require('../../schemas/order');

async function calculateTotalSoldById(productId) {
  try {
    const orders = await Order.find({ 'products.itemReference': productId });

    let totalSold = 0;

    orders.forEach((order) => {
      order.products.forEach((p) => {
        if (p.itemReference.toString() === productId.toString()) {
          totalSold += 1; // each product is one unit
        }
      });
    });

    console.log(`Total sold for product ${productId}:`, totalSold);
    return totalSold;
  } catch (err) {
    console.error('Error calculating total sold:', err);
    throw err;
  }
}

module.exports = {
  calculateTotalSoldById,
};
