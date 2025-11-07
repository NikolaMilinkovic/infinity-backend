const mongoose = require('mongoose');
const { betterConsoleLog } = require('../utils/logMethods');
const Schema = mongoose.Schema;

const ProductDisplayCounterSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
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
  },
  { timestamps: true }
);

// Register the model once
ProductDisplayCounterSchema.index({ boutiqueId: 1 }, { unique: true });
const ProductDisplayCounter = mongoose.model('ProductDisplayCounter', ProductDisplayCounterSchema);

module.exports = ProductDisplayCounter;
