const Order = require('../schemas/order');
const User = require('../schemas/user')
const bcrypt = require('bcryptjs');
const SizeStockColor = require('../schemas/product/sizeStockColor');
const SizeStockProduct = require('../schemas/product/sizeStockProduct');
const { AppSettings } = require('../schemas/appSchema');
const Category = require('../schemas/category');
const Color = require('../schemas/color');
const Courier = require('../schemas/courier');
const Dress = require('../schemas/dress');
const DressColor = require('../schemas/dressColor');
const ProcessedOrdersForPeriod = require('../schemas/processedOrdersForPeriod');
const { ProductDisplayCounter } = require('../schemas/productDisplayCounter');
const Purse = require('../schemas/purse');
const PurseColor = require('../schemas/purseColor');
const Supplier = require('../schemas/supplier');
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

/**
 * Adds timestamps to all files that have no timestamp fields present
 * Fields added are: createdAt & updatedAt ✔️
 * 
 * Models:
 * - sizeStockColor           ❌
 * - sizeStockProduct         ❌
 * - appSettings              ❌
 * - category                 ❌
 * - color                    ❌
 * - courier                  ❌
 * - dress                    ❌
 * - dressColor               ❌
 * - order                    ❌
 * - processedOrdersForPeriod ❌
 * - productDisplayCounter    ❌
 * - purse                    ❌
 * - purseColor               ❌
 * - supplier                 ❌
 */
async function updateTimestamps(models = [
  SizeStockColor,
  SizeStockProduct,
  AppSettings, 
  Category, 
  Color, 
  Courier, 
  Dress, 
  DressColor, 
  ProcessedOrdersForPeriod, 
  ProductDisplayCounter, 
  Purse, 
  PurseColor, 
  Supplier, 
  Order,
  User
]) {
  try{
    const now = new Date();
    
    for(const model of models){
      const bulkOps = [];
      console.log('Model:', model);

      if (!model.find) {
        console.error(`Model ${model.modelName} is not a valid Mongoose model.`);
        continue;
      }

      const documents = await model.find({});
      documents.forEach(doc => {
        // if (!doc.createdAt || !doc.updatedAt) {
          // bulkOps.push({
          //   updateOne: {
          //     filter: { _id: doc._id },
          //     update: { 
          //       $set: { 
          //         createdAt: doc.createdAt || now, 
          //         updatedAt: doc.updatedAt || now 
          //       }
          //     }
          //   }
          // });
        // }
        doc.save()
      });
  
      // if (bulkOps.length > 0) {
      //   await model.bulkWrite(bulkOps);
      //   console.log(`${bulkOps.length} documents updated.`);
      // } else {
      //   console.log(`No documents needed updating.`);
      // }

    }
  } catch(error){
    console.error(`There was an error adding timestamps to files:`, error);
  }
}

module.exports = {
  addUserOnStartup,
  resetAllOrdersPackedState,
  resetAllOrdersProcessedState,
  updateTimestamps
};