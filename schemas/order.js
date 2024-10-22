const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  buyer: {
    name: { type: String, required: [true, 'Buyer name is required'] },
    address: { type: String, required: [true, 'Buyer address is required'] },
    phone: { type: String, required: [true, 'Phone number is required'] },
    profileImage: {
      uri: { type: String, required: [true, 'Image is required'] },
      imageName: { type: String, require: [true, 'Image Name is required'] },
    },
  },
  products: [
    {
      itemReference: { type: Schema.Types.ObjectId, required: [true, 'Item Reference is required'] },
      selectedColor: { type: String, required: [true, 'Item color is required'] },
      selectedSize: { type: String, require: false },
    }
  ],
  productsPrice: { type: Number, required: [true, 'Products price is required'] },
  totalPrice: { type: Number, required: [true, 'Total price is required'] },
  reservation: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  processed: { type: Boolean, default: false },
  courier: {
    name: { type: String, required: false },
    deliveryPrice: { type: Number, required: false }
  },
}, { timestamps: true }); 

module.exports = mongoose.model("Order", OrderSchema);