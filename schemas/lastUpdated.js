const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lastUpdatedSchema = new Schema({
  appSchemaLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  userLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  categoryLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  courierLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  colorLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  dressLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  dressColorLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  purseLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  purseColorLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  supplierLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  orderLastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const LastUpdated = mongoose.model('LastUpdated', lastUpdatedSchema);

// Initialization function
async function initializeLastUpdatedTracker() {
  try {
    const existingSettings = await LastUpdated.findOne();
    if (!existingSettings) {
      const newTracker = await LastUpdated.create({}); 
      console.log('> Initialized LastUpdated tracker:', newTracker);
    }
  } catch (error) {
    console.error('Error initializing LastUpdated tracker:', error);
  }
}

module.exports = {
  LastUpdated,
  initializeLastUpdatedTracker,
};