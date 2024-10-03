const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: { type: String, required: [true, 'Item name is required'] },
  active: { type: Boolean, default: true },
  category: { type: String, required: [true, 'Category is required'] },
  price: { type: Number, required: [true, 'Price is required'] },
  courier: { type: String, required: [true, 'Courier is required'] },
  packed: { type: Boolean, default: false },
  colors: [{ type: Schema.Types.ObjectId, ref: 'DressColor' }]
});

module.exports = mongoose.model("Item", ItemSchema);
