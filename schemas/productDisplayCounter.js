const mongoose = require('mongoose');
const { betterConsoleLog } = require('../utils/logMethods');
const Schema = mongoose.Schema;

const ProductDisplayCounterSchema = new Schema({
  high: { 
    type: Number, 
    required: false,
    default: 1,
  },
  low: { 
    type: Number, 
    required: false,
    default: 0, 
  },
}, { timestamps: true }); 

// Register the model once
const ProductDisplayCounter = mongoose.model('ProductDisplayCounter', ProductDisplayCounterSchema);

async function initializeProductDisplayCounter() {
  try {
    const existingCounter = await ProductDisplayCounter.findOne({});

    if (!existingCounter) {
      console.log('> Creating new product display counter...');
      await ProductDisplayCounter.create({});
    }
  } catch (error) {
    console.error('Error initializing product display counter:', error);
  }
}

// Export model and function in one object
module.exports = {
  ProductDisplayCounter,
  initializeProductDisplayCounter,
};
