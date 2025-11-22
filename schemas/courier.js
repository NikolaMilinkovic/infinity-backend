const mongoose = require('mongoose');
const { Schema } = mongoose;

const CourierSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a courier name'],
      trim: true,
    },
    deliveryPrice: {
      type: Number,
      required: [true, 'Please provide a delivery price'],
    },
    excelSchemaId: {
      type: Schema.Types.ObjectId,
      ref: 'Excell',
      default: null,
    },
  },
  { timestamps: true }
);

// Unique courier name per boutique
CourierSchema.index({ boutiqueId: 1, name: 1 }, { unique: true });

// Quick lookup by boutique and linked schema
CourierSchema.index({ boutiqueId: 1, excelSchemaId: 1 });

module.exports = mongoose.model('Courier', CourierSchema);
