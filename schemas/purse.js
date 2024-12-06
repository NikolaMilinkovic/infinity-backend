const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PurseSchema = new Schema({
  name: { type: String, required: [true, 'Item name is required'] },
  active: { type: Boolean, default: true },
  category: { type: String, required: [true, 'Category is required'] },
  stockType: { type: String, required: [true, 'Stock type is required'] },
  price: { type: Number, required: [true, 'Price is required'] },
  colors: [{ type: Schema.Types.ObjectId, ref: 'PurseColor' }],
  image: {
    uri: { type: String, required: [true, 'Image is required'] },
    imageName: { type: String, require: [true, 'Image Name is required'] },
  },
  description: { type: String, required: false },
  displayPriority: { type: Number, required: [true, 'Display Priority indicator is required'] },
  supplier: { type: String, required: false },
});

PurseSchema.index({ active: 1 }); 

module.exports = mongoose.model("Purse", PurseSchema);