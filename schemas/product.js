const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: { type: String, required: [true, 'Item name is required'] }, // DONE
  active: { type: Boolean, default: true }, // DONE
  category: { type: String, required: [true, 'Category is required'] }, // DONE
  price: { type: Number, required: [true, 'Price is required'] }, // DONE
  colors: [{ type: Schema.Types.ObjectId, ref: 'DressColor' }]
});

module.exports = mongoose.model("Item", ItemSchema);

  // OVA DVA IDU U PORUDZBINU !!!
  // courier: { type: String, required: [true, 'Courier is required'] }, 
  // packed: { type: Boolean, default: false },
