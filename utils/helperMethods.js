const Order = require('../schemas/order');
const User = require('../schemas/user');
const bcrypt = require('bcryptjs');
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
const { betterErrorLog, betterConsoleLog } = require('./logMethods');
const { LastUpdated } = require('../schemas/lastUpdated');

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
        $set: { packed: false, packedIndicator: false },
      }
    );

    console.log(`Successfully updated ${result.nModified} orders.`);
  } catch (error) {
    console.error('Error updating orders:', error);
  }
}

async function resetAllOrdersProcessedState() {
  try {
    // Update all orders to set processed false
    const result = await Order.updateMany(
      {}, // This selects all orders
      {
        $set: { processed: false },
      }
    );

    console.log(`Successfully updated ${result.nModified} orders.`);
  } catch (error) {
    betterErrorLog('Error updating orders:', error);
  }
}

/**
 * Adds timestamps to all files that have no timestamp fields present
 * Fields added are: createdAt & updatedAt ✔️
 *
 * Models:
 * - appSettings              ✔️
 * - category                 ✔️
 * - color                    ✔️
 * - courier                  ✔️
 * - dress                    ✔️
 * - dressColor               ✔️
 * - order                    ✔️
 * - processedOrdersForPeriod ✔️
 * - productDisplayCounter    ✔️
 * - purse                    ✔️
 * - purseColor               ✔️
 * - supplier                 ✔️
 */
async function updateTimestamps(
  models = [
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
    User,
  ]
) {
  try {
    const now = new Date();

    for (const model of models) {
      const bulkOps = [];
      console.log('Model:', model);

      if (!model.find) {
        console.error(`Model ${model.modelName} is not a valid Mongoose model.`);
        continue;
      }

      const documents = await model.find({});
      documents.forEach((doc) => {
        doc.save();
      });
    }
  } catch (error) {
    betterErrorLog(`There was an error adding timestamps to files:`, error);
  }
}

/**
 * Iterates and compares lastUpdated methods, returns isEqual and an array of mismatched keys
 * @param { LastUpdated data from the user } data
 * @param { LastUpdated data from the server } serverData
 * @returns {isEqual: Boolean, mismatchedKeys: String[]}
 */
function compareObjects(data, serverData) {
  const normalizeDate = (date) => (date instanceof Date ? date.toISOString() : date);

  const mismatchedKeys = [];

  let isEqual = true;

  for (const key of Object.keys(data)) {
    const dataValue = data[key];
    const serverValue = serverData[key];

    const isMatch =
      key === '_id'
        ? dataValue.toString() === serverValue.toString()
        : serverValue instanceof Date
        ? normalizeDate(dataValue) === normalizeDate(serverValue)
        : dataValue === serverValue;

    if (!isMatch) {
      mismatchedKeys.push(key);
      isEqual = false;
    }
  }

  return { isEqual, mismatchedKeys };
}

/**
 * Compares users version of LastUpdated document with the one on the server
 * Returns true if they are the same and an empty array
 * If they are different returns false and all the keys that are different
 * @param {LastUpdated document that is present on the client} data
 * @returns {isEqual: Boolean, mismatchedKeys: String[]}
 */
async function validateLastUpdated(data) {
  try {
    const serverData = await LastUpdated.findOne({});
    const compareResult = compareObjects(data, serverData);
    return compareResult;
  } catch (error) {
    betterErrorLog(`There was an error validation last updated objects:`, error);
  }
}

/**
 * Updates the key of the LastUpdated document with new Date value
 * @param {String - Name of the field that we are updating} key
 * Possible values for key
 * - appSchemaLastUpdatedAt
 * - userLastUpdatedAt
 * - categoryLastUpdatedAt
 * - courierLastUpdatedAt
 * - colorLastUpdatedAt
 * - dressLastUpdatedAt
 * - dressColorLastUpdatedAt
 * - purseLastUpdatedAt
 * - purseColorLastUpdatedAt
 * - supplierLastUpdatedAt
 * - productDisplayCounterLastUpdatedAt
 * - processedOrdersForPeriodLastUpdatedAt
 * - orderLastUpdatedAt
 * @returns {isUpdated: Boolean, newDate: Date | null}
 */
async function updateLastUpdatedField(key, io) {
  if (!key) console.error('> key in updateLastUpdatedField method is required');
  if (!io) console.error('> io in updateLastUpdatedField method is required');
  try {
    const document = await LastUpdated.findOne({});
    const date = new Date();
    if (!document) {
      console.error('Document not found in the updateLastUpdatedField method');
      return { isUpdated: false, newDate: null };
    }
    document[key] = date;
    await document.save();
    if (io) {
      io.emit('syncLastUpdated', document);
    }

    betterConsoleLog('> Last updated:', document);
    return { isUpdated: true, newDate: date };
  } catch (error) {
    betterErrorLog(`There was an error updating the field ${key} of lastUpdated document`, error);
    return { isUpdated: false, newDate: null };
  }
}

/**
 * LastUpdated.findOne({})
 * @returns LastUpdated document from the database
 */
async function getLastUpdated() {
  try {
    const document = await LastUpdated.findOne({});
    return document;
  } catch (error) {
    betterErrorLog(`There was an error while fetching the LastUpdated document`, error);
  }
}

/**
 *
 * @param {Array of mismatchedKeys used to fetch the missing data} mismatchedKeys
 */
// user                             ❌
// appSchema                        ❌
// category                         ✔️
// courier                          ✔️
// color                            ✔️
// dress                            ✔️
// dressColor                       ✔️
// purse                            ✔️
// purseColor                       ✔️
// supplier                         ✔️
// order                            ✔️

async function getUpdatedMismatchedData(mismatchedKeys) {
  if (mismatchedKeys.length === 0) return;
  let results = [];
  try {
    const keys = mismatchedKeys
      .filter((key) => key && key !== 'updatedAt')
      .map((key) => {
        const formattedKey = formatFieldName(key);
        return formattedKey;
      });
    for (const key of keys) {
      try {
        let data;

        switch (key) {
          // USER
          case 'user':
            break;
          // APP SETTINGS
          case 'appSchema':
            data = await AppSettings.findOne();
            break;
          // CATEGORY
          case 'category':
            data = await Category.find();
            break;
          // COURIER
          case 'courier':
            data = await Courier.find();
            break;
          // COLOR
          case 'color':
            data = await Color.find();
            break;
          // DRESS
          case 'dress':
            data = [];
            break;
          // DRESS COLOR
          case 'dressColor':
            data = [];
            break;
          // PURSE
          case 'purse':
            data = [];
            break;
          // PURSE COLOR
          case 'purseColor':
            data = [];
            break;
          // SUPPLIER
          case 'supplier':
            data = await Supplier.find();
            break;
          // ORDER
          case 'order':
            const processed = await Order.find({ processed: true })
              .sort({ createdAt: -1 })
              .populate('products.itemReference');

            const unprocessed = await Order.find({ processed: false })
              .sort({ createdAt: -1 })
              .populate('products.itemReference');

            data = {
              processed,
              unprocessed,
            };
            break;
        }

        results.push({
          key,
          data,
          success: true,
        });
      } catch (error) {
        betterErrorLog(`Error processing key ${key}:`, error);
        results.push({
          key,
          data: [],
          success: false,
          error: error.message,
        });
      }
    }
    return results;
  } catch (error) {
    betterErrorLog(`There was an error in getUpdatedMismatchedData method while fetching data.`, error);
  }
}

/**
 *
 * @param {String} fieldName
 * @returns {String} Capitalized fieldName without the LastUpdatedAt
 */
function formatFieldName(fieldName) {
  // Regex to match 'LastUpdatedAt' at the end of the string
  const regex = /LastUpdatedAt$/i;

  // Remove 'LastUpdatedAt' and capitalize the first character
  const cleanedFieldName = fieldName.replace(regex, '');
  return cleanedFieldName;
}

/**
 * Validates the existence of LastUpdated file in the database
 * If file is not present it will create a new one
 */
async function ensureLastUpdatedDocument() {
  try {
    let document = await LastUpdated.findOne({});
    if (!document) {
      document = new LastUpdated({});
      await document.save();
      console.log('> Created a new LastUpdated document.');
    }
  } catch (error) {
    betterErrorLog('> Error ensuring LastUpdated document exists:', error);
  }
}

/**
 * Fetches and counts all available products
 * Logs all dresses / purses and total combined
 */
async function getSumOfAllProducts() {
  try {
    let dresses = await Dress.find().populate('colors');
    console.log(`> Fetched dresses: ${dresses.length}`);
    let purses = await Purse.find().populate('colors');
    console.log(`> Fetched purses: ${purses.length}`);

    let dressSum = 0;
    let purseSum = 0;

    for (const dress of dresses) {
      for (const color of dress.colors) {
        for (const size of color.sizes) {
          dressSum += size.stock;
        }
      }
    }
    console.log(`> Ukupno haljina: ${dressSum}`);
    for (const purse of purses) {
      for (const color of purse.colors) {
        purseSum += color.stock;
      }
    }
    console.log(`> Ukupno torbica: ${purseSum}`);
    console.log(`> Totalno proizvoda: ${dressSum + purseSum}`);
  } catch (error) {
    betterErrorLog('> Error while running getSumOfAllProducts:', error);
  }
}

async function ensureAppSettingsDocument() {
  try {
    let document = await AppSettings.findOne({});
    if (!document) {
      document = new AppSettings({});
      document.boutiqueName = 'Infinity';
      await document.save();
      console.log('> Created a new AppSettings document.');
    } else {
      console.log('> AppSettings document found.');
    }
  } catch (error) {
    betterErrorLog('> Error ensuring AppSettings document exists:', error);
  }
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
}

module.exports = {
  addUserOnStartup,
  resetAllOrdersPackedState,
  resetAllOrdersProcessedState,
  updateTimestamps,
  validateLastUpdated,
  updateLastUpdatedField,
  getLastUpdated,
  getUpdatedMismatchedData,
  ensureLastUpdatedDocument,
  getSumOfAllProducts,
  ensureAppSettingsDocument,
  isAdmin,
};
