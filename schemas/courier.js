const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourierSchema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Please provide a courier name'], 
    unique: [true, 'This courier already exists']
  }
});

module.exports = mongoose.model('Courier', CourierSchema);
