const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SizeStockProduct = new Schema({
  name: { type: String, required: [true, 'Item name is required'] },
  active: { type: Boolean, default: true },
  category: { type: String, required: [true, 'Category is required'] },
  price: { type: Number, required: [true, 'Price is required'] },
  colors: [{ type: Schema.Types.ObjectId, ref: 'SizeStockColor' }],
  image: {
    uri: { type: String, required: [true, 'Image is required'] },
    imageName: { type: String, require: [true, 'Image Name is required'] },
  },
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now}
}); 

module.exports = mongoose.model("SizeStockProduct", SizeStockProduct);