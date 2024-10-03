const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColorSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please enter a valid color name'],
    unique: [true, 'This color already exists']
  },
  colorCode: {
    type: String,
    required: false,
    default: ''
  }
});

module.exports = mongoose.model("Color", ColorSchema);
