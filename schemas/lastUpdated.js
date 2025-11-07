const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lastUpdatedSchema = new Schema(
  {
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
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
  },
  { timestamps: true }
);

const LastUpdated = mongoose.model('LastUpdated', lastUpdatedSchema);

module.exports = {
  LastUpdated,
};
