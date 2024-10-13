const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PurseColorSchema = new Schema({
  color: {
    type: String,
    required: [true, 'Please enter a valid color'],
    unique: [false, 'A color under this name already exists, please provide a unique name']
  },
  colorCode: {
    type: String,
    required: [false, 'Please enter a valid color code']
  },
  stock: { type: Number, required: true, default: 0 }
});

module.exports = mongoose.model("PurseColor", PurseColorSchema); 