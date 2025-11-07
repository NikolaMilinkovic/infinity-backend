const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColorSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please enter a valid color name'],
      unique: false,
    },
    colorCode: {
      type: String,
      required: false,
      default: '',
    },
  },
  { timestamps: true }
);

ColorSchema.index({ boutiqueId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Color', ColorSchema);
