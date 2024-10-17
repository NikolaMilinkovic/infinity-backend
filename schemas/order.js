const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  buyer: {
    fullName: { type: String, required: [true, 'Buyer name is required'] },
    address: { type: String, required: [true, 'Buyer address is required'] },
    phone: { type: String, required: [true, 'Phone number is required'] }
  },
  products: [
    {
      name: { type: String, required: [true, 'Product name is required'] },
      category: {type: String, required: [true, 'Product category is required']},
      price: { type: Number, required: [true, 'Product price is required'] },
      color: { type: String, required: [true, 'Product color is required'] },
      size: { type: String, required: false },
      image: {
        uri: { type: String, required: [true, 'Image URI is required'] },
        imageName: { type: String, required: [true, 'Image name is required'] },
      }
    }
  ],
  price: { type: Number, required: [true, 'Order price is required'] },
  packed: { type: Boolean, default: false },
  processed: { type: Boolean, default: false },
  courier: { type: String, required: [true, 'Courier is required'] },
}, { timestamps: true }); 

module.exports = mongoose.model("Order", OrderSchema);
