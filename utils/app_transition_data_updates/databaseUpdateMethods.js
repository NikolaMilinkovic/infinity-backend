const Color = require('../../schemas/color');
const Courier = require('../../schemas/courier');
const Supplier = require('../../schemas/supplier');
const Category = require('../../schemas/category');
const User = require('../../schemas/user');
const Dress = require('../../schemas/dress');
const Purse = require('../../schemas/purse');
const Boutique = require('../../schemas/boutiqueSchema');
const ProductDisplayCounter = require('../../schemas/productDisplayCounter');
const Order = require('../../schemas/order');
const ProcessedOrdersForPeriod = require('../../schemas/processedOrdersForPeriod');
const Version = require('../../schemas/version');
const { LastUpdated } = require('../../schemas/lastUpdated');

async function createInitialBoutique() {
  try {
    // Check if a boutique already exists
    const existing = await Boutique.findOne();
    if (existing) {
      console.log('Boutique already exists:', existing.boutiqueName);
      return existing;
    }

    // Create a new boutique
    const newBoutique = new Boutique({
      boutiqueName: 'Infinity_boutique',
      isActive: true,
      settings: {
        appIcon: {
          appIconUri:
            'https://infinity-boutique.s3.eu-central-1.amazonaws.com/images/app-icons/542d33dbad77247271be4f625f1328ab0b988242802a8647066f47d5b470a7c2.jpeg',
          appIconName: '542d33dbad77247271be4f625f1328ab0b988242802a8647066f47d5b470a7c2.jpeg',
        },
        orders: {
          requireBuyerImage: false,
        },
        defaults: {
          courier: 'Bex',
          listProductsBy: 'category',
        },
      },
    });

    const saved = await newBoutique.save();
    console.log('Created new boutique:', saved.boutiqueName);
    return saved;
  } catch (err) {
    console.error('Error creating boutique:', err);
    throw err;
  }
}

// COLORS
async function updateAllColorsWithBoutiqueId(boutiqueId) {
  try {
    const result = await Color.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} colors with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating colors:', err);
  }
}

// COURIERS
async function updateAllCouriersWithBoutiqueId(boutiqueId) {
  try {
    const result = await Courier.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} couriers with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating couriers:', err);
  }
}

// SUPPLIER
async function updateAllSuppliersWithBoutiqueId(boutiqueId) {
  try {
    const result = await Supplier.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} suppliers with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating suppliers:', err);
  }
}

// SUPPLIER
async function updateAllCategoriesWithBoutiqueId(boutiqueId) {
  try {
    const result = await Category.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} categories with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating categories:', err);
  }
}

// USER
async function updateAllUsersWithBoutiqueId(boutiqueId) {
  try {
    const result = await User.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} users with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating users wtih boutique id field:', err);
  }
}

// USER - FIRST TIME SETUP
async function updateAllUsersWithFirstTimeSetupField() {
  try {
    const result = await User.updateMany(
      { 'settings.firstTimeSetupDone': { $exists: false } },
      { $set: { 'settings.firstTimeSetupDone': false } }
    );
    console.log(`> Updated ${result.modifiedCount} users`);
  } catch (err) {
    console.error('> Error updating users with first time setup field:', err);
  }
}

// DRESS
async function updateAllDressesWithBoutiqueId(boutiqueId) {
  try {
    const result = await Dress.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} dresses with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating dresses:', err);
  }
}

// PURSE
async function updateAllPursesWithBoutiqueId(boutiqueId) {
  try {
    const result = await Purse.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} purses with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating purses:', err);
  }
}

// PURSE
async function updateAllProductDisplayCountersWithBoutiqueId(boutiqueId) {
  try {
    const result = await ProductDisplayCounter.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} product display counters with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating product display counters:', err);
  }
}

// ORDER
async function updateAllOrdersWithBoutiqueId(boutiqueId) {
  try {
    const result = await Order.updateMany({ boutiqueId: { $exists: false } }, { $set: { boutiqueId } });

    console.log(`> Updated ${result.modifiedCount} orders with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating orders:', err);
  }
}

// PROCESSED ORDERS FOR PERIOD
async function updateAllProcessedOrdersForPeriodWithBoutiqueId(boutiqueId) {
  try {
    const result = await ProcessedOrdersForPeriod.updateMany(
      { boutiqueId: { $exists: false } },
      { $set: { boutiqueId } }
    );

    console.log(`> Updated ${result.modifiedCount} processed orders for period with boutiqueId ${boutiqueId}`);
  } catch (err) {
    console.error('> Error updating processed orders for period:', err);
  }
}

/**
 * Ensures version collection exists and one global version document is present.
 * @returns {Promise<void>}
 */
async function ensureVersionDocument() {
  try {
    let existing = await Version.findOne();
    if (!existing) {
      const defaultVersion = new Version({
        version: '1.0.0',
        buildLinkAndroid: '',
        buildLinkIOS: '',
      });
      await defaultVersion.save();
      console.log('> Version collection initialized with default version 1.0.0');
    } else {
      console.log('> Version document already exists');
    }
  } catch (err) {
    console.error('> Error initializing version collection:', err);
  }
}

/**
 * Updates all the boutiques with missing fields
 */
async function updateAllBoutiquesWithRequireBuyerImageField() {
  try {
    const result = await Boutique.updateMany(
      {
        // Only boutiques missing this field
        'settings.orders.requireBuyerImage': { $exists: true },
      },
      {
        $set: {
          'settings.orders.requireBuyerImage': true,
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} boutiques`);
  } catch (err) {
    console.error('Error updating boutiques:', err);
  }
}

async function updateAllUsersWithNewFields() {
  try {
    console.log('🔄 Starting migration...');

    // 1️⃣ Add enableCroppingForProductImage if missing
    const result1 = await User.updateMany(
      {
        $or: [
          { 'settings.productsManager.enableCroppingForProductImage': { $exists: false } },
          { 'settings.productsManager.useAspectRatioForProductImage': { $exists: false } },
        ],
      },
      {
        $set: {
          'settings.productsManager.enableCroppingForProductImage': true,
          'settings.productsManager.useAspectRatioForProductImage': true,
        },
      }
    );
    console.log(`> Added 'enableCroppingForProductImage'`);
    console.log(`> Matched: ${result1.matchedCount}, Modified: ${result1.modifiedCount}`);

    // 2️⃣ Add ordersManager fields if missing (safe, won't remove existing fields)
    const result2 = await User.updateMany(
      {
        $or: [
          { 'settings.ordersManager.enableCroppingForBuyerImage': { $exists: false } },
          { 'settings.ordersManager.useAspectRatioForBuyerImage': { $exists: false } },
        ],
      },
      {
        $set: {
          'settings.ordersManager.enableCroppingForBuyerImage': false,
          'settings.ordersManager.useAspectRatioForBuyerImage': false,
        },
      }
    );
    console.log(`> Added missing 'ordersManager' fields`);
    console.log(`> Matched: ${result2.matchedCount}, Modified: ${result2.modifiedCount}`);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function addExcelPermissions() {
  try {
    console.log('🔄 Starting migration...');

    const result = await User.updateMany(
      {
        $or: [
          { 'permissions.navigation.excel_manager': { $exists: false } },
          { 'permissions.excel': { $exists: false } },
        ],
      },
      {
        $set: {
          'permissions.navigation.excel_manager': false,
          'permissions.excel': {
            create: false,
            update: false,
            delete: false,
          },
        },
      }
    );

    console.log(`> Added 'excel_manager' and 'permissions.excel' where missing`);
    console.log(`> Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function addExcelPresetLastUpdatedAt() {
  try {
    console.log('🔄 Starting update of excelPresetLastUpdatedAt...');

    const result = await LastUpdated.updateMany(
      { excelPresetLastUpdatedAt: { $exists: false } },
      { $set: { excelPresetLastUpdatedAt: new Date() } }
    );

    console.log(`✅ Done. Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function addIsDeletedFieldToOrders() {
  try {
    console.log('🔄 Starting migration to add isDeleted field...');

    const result = await Order.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });

    console.log(`> Orders matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function addIsDeletedFieldToDresses() {
  try {
    console.log('🔄 Starting migration to add isDeleted field to Dresses...');

    const result = await Dress.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });

    console.log(`> Dresses matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Dresses migration completed successfully!');
  } catch (error) {
    console.error('❌ Dresses migration failed:', error);
    throw error;
  }
}

async function addIsDeletedFieldToPurses() {
  try {
    console.log('🔄 Starting migration to add isDeleted field to Purses...');

    const result = await Purse.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });

    console.log(`> Purses matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Purses migration completed successfully!');
  } catch (error) {
    console.error('❌ Purses migration failed:', error);
    throw error;
  }
}

async function addSessionsFieldToUsers() {
  try {
    console.log('🔄 Starting migration to add sessions field to Users...');

    const result = await User.updateMany(
      { sessions: { $exists: false } },
      {
        $set: {
          sessions: {
            mobile: { token: null, deviceId: null },
            pc: { token: null, deviceId: null },
          },
        },
      }
    );

    console.log(`> Users matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Users migration completed successfully!');
  } catch (error) {
    console.error('❌ Users migration failed:', error);
    throw error;
  }
}

async function addExcelFieldToCouriers() {
  try {
    console.log('🔄 Starting migration to add excelSchemaId field to Couriers...');

    const result = await Courier.updateMany({ excelSchemaId: { $exists: false } }, { $set: { excelSchemaId: null } });

    console.log(`> Couriers matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Couriers migration completed successfully!');
  } catch (error) {
    console.error('❌ Couriers migration failed:', error);
    throw error;
  }
}

async function addAppIconsToBoutiques() {
  try {
    console.log(
      '🔄 Starting migration to add appIcon_on_white_background and appIcon_on_black_background to Boutiques...'
    );

    const result = await Boutique.updateMany(
      {
        $or: [
          { 'settings.appIcon_on_white_background': { $exists: false } },
          { 'settings.appIcon_on_black_background': { $exists: false } },
        ],
      },
      {
        $set: {
          'settings.appIcon_on_white_background': {
            appIconUri: '',
            appIconName: '',
          },
          'settings.appIcon_on_black_background': {
            appIconUri: '',
            appIconName: '',
          },
        },
      }
    );

    console.log(`> Boutiques matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    console.log('✅ Boutique migration completed successfully!');
  } catch (error) {
    console.error('❌ Boutique migration failed:', error);
    throw error;
  }
}

module.exports = {
  updateAllColorsWithBoutiqueId,
  updateAllCouriersWithBoutiqueId,
  updateAllSuppliersWithBoutiqueId,
  updateAllCategoriesWithBoutiqueId,
  updateAllUsersWithBoutiqueId,
  updateAllUsersWithFirstTimeSetupField,
  updateAllDressesWithBoutiqueId,
  updateAllPursesWithBoutiqueId,
  updateAllProductDisplayCountersWithBoutiqueId,
  updateAllOrdersWithBoutiqueId,
  updateAllProcessedOrdersForPeriodWithBoutiqueId,
  ensureVersionDocument,
  updateAllBoutiquesWithRequireBuyerImageField,
  createInitialBoutique,
  updateAllUsersWithNewFields,
  addExcelPermissions,
  addExcelPresetLastUpdatedAt,
  addIsDeletedFieldToOrders,
  addIsDeletedFieldToDresses,
  addIsDeletedFieldToPurses,
  addSessionsFieldToUsers,
  addExcelFieldToCouriers,
  addAppIconsToBoutiques,
};
