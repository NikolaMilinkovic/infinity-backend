const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DressColorSchema = new Schema(
  {
    color: {
      type: String,
      required: [true, 'Please enter a valid color'],
      unique: false,
    },
    colorCode: {
      type: String,
      required: [false, 'Please enter a valid color code'],
    },
    sizes: [
      {
        size: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DressColor', DressColorSchema);
