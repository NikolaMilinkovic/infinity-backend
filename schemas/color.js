const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColorSchema = new Schema({
  color: { type:String, required: [true, 'Please enter a valid color'], unique: [true, 'A color under this name already exists, pelase provide a unique name'] },
  colorCode: { type:String, required: [false, 'Please enter a valid color code'] },
  sizes: [
    {
      size: { type: String, required: true },
      stock: { type: Number, required: true, default: 0 }
    }
  ]
});

module.exports = mongoose.model("Color", ColorSchema);