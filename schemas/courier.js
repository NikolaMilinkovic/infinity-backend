const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourierSchema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Please provide a courier name'], 
    unique: [true, 'This courier already exists']
  },
  deliveryPrice: { 
    type: Number, 
    required: [true, 'Please provide a courier name'], 
  },
}, { timestamps: true }); 

module.exports = mongoose.model('Courier', CourierSchema);
