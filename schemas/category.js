const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Please provide a category name'], 
    unique: [true, 'This category already exists'] 
  }
});

module.exports = mongoose.model('Category', CategorySchema);
