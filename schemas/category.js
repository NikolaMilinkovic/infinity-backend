const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      unique: false,
    },
    stockType: {
      type: String,
      required: [true, 'Please provide a stock type'],
      unique: false,
    },
  },
  { timestamps: true }
);

CategorySchema.index({ boutiqueId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Category', CategorySchema);
