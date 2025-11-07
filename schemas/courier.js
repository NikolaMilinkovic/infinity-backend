const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourierSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a courier name'],
      unique: false,
    },
    deliveryPrice: {
      type: Number,
      required: [true, 'Please provide a courier name'],
    },
  },
  { timestamps: true }
);

CourierSchema.index({ boutiqueId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Courier', CourierSchema);
