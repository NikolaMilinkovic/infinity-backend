const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DressSchema = new Schema({
  name: { type: String, required: [true, 'Item name is required'] },
  active: { type: Boolean, default: true },
  category: { type: String, required: [true, 'Category is required'] },
  stockType: { type: String, required: [true, 'Stock type is required'] },
  price: { type: Number, required: [true, 'Price is required'] },
  colors: [{ type: Schema.Types.ObjectId, ref: 'DressColor' }],
  image: {
    uri: { type: String, required: [true, 'Image is required'] },
    imageName: { type: String, require: [true, 'Image Name is required'] },
  },
  description: { type: String, required: false },
  displayPriority: { type: Number, required: [true, 'Display Priority indicator is required'] },
  supplier: { type: String, required: false },
}, { timestamps: true }); 

DressSchema.index({ active: 1 }); 

module.exports = mongoose.model("Dress", DressSchema);

// OVA DVA IDU U PORUDZBINU !!!
// courier: { type: String, required: [true, 'Courier is required'] }, 
// packed: { type: Boolean, default: false },
