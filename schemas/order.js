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
      product: { type: Schema.Types.ObjectId, required: [true, 'Product is required'] },
      productType: { type: String, required: [true, 'Product type is required'] },
      quantity: { type: Number, required: [true, 'Product quantity is required'] },
    }
  ],
  price: { type: Number, required: [true, 'Order price is required'] },
  packed: { type: Boolean, default: false },
  processed: { type: Boolean, default: false },
  courier: { type: String, required: [true, 'Courier is required'] },
}, { timestamps: true }); 

module.exports = mongoose.model("Order", OrderSchema);
