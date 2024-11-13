const Order = require('../schemas/order');
const User = require('../schemas/user')
const bcrypt = require('bcryptjs');
const { betterErrorLog } = require('./logMethods');
/**
 * Adds a user to the database if they do not already exist.
 * @param {String} username - The username for the new user.
 * @param {String} plainPassword - The plain text password for the new user.
 */
async function addUserOnStartup(username, plainPassword) {
  try {
    const existingUser = await User.findOne({ username });

    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      const newUser = new User({
        username,
        password: hashedPassword,
      });

      await newUser.save();

      console.log(`> User [${newUser.username}] created`);
    } else {
      console.log(`> User [${username}] already exists`);
    }
  } catch (error) {
    betterErrorLog('> Error creating a user:', error);
  }
}

/**
 * When called resets all orders packed & packedIndicator state to false
 */
async function resetAllOrdersPackedState() {
  try {
    // Update all orders to set packed and packedIndicator to false
    const result = await Order.updateMany(
      {}, // This selects all orders
      { 
        $set: { packed: false, packedIndicator: false } 
      }
    );
    
    console.log(`Successfully updated ${result.nModified} orders.`);
  } catch (error) {
    console.error("Error updating orders:", error);
  }
}

async function resetAllOrdersProcessedState() {
  try {
    // Update all orders to set processed false
    const result = await Order.updateMany(
      {}, // This selects all orders
      { 
        $set: { processed: false } 
      }
    );
    
    console.log(`Successfully updated ${result.nModified} orders.`);
  } catch (error) {
    console.error("Error updating orders:", error);
  }
}

module.exports = {
  addUserOnStartup,
  resetAllOrdersPackedState,
  resetAllOrdersProcessedState
};