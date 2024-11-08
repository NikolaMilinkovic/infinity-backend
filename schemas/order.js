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
      itemReference: { type: Schema.Types.ObjectId, required: [true, 'Product Reference is required'] },
      name: { type: String, required: [true, 'Product name is required'] },
      category: { type: String, required: [true, 'Product category is required'] },
      price: { type: Number, required: [true, 'Product price is requried'] },
      stockType: { type: String, required: [true, 'Product Stock type is required'] },
      image: {
        uri: { type: String, required: [true, 'Image is required'] },
        imageName: { type: String, require: [true, 'Image Name is required'] },
      },
      mongoDB_type: { type: String, required: [true, 'mongoDB_type is required to be either Dress | Purse'], enum: ['Dress', 'Purse'] },
      selectedColor: { type: String, required: [true, 'Item color is required'] },
      selectedColorId: { type: String, required: [true, 'Selected color id is required'] },
      selectedSize: { type: String, require: false },
      selectedSizeId: { type: String, required: false },
    }
  ],
  productsPrice: { type: Number, required: [true, 'Products price is required'] },
  totalPrice: { type: Number, required: [true, 'Total price is required'] },
  reservation: { type: Boolean, default: false },
  packedIndicator: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  processed: { type: Boolean, default: false },
  courier: {
    name: { type: String, required: false },
    deliveryPrice: { type: Number, required: false }
  },
}, { timestamps: true }); 

OrderSchema.index({ reservation: 1 }); 
OrderSchema.index({ processed: 1 }); 
OrderSchema.index({ packed: 1 }); 

module.exports = mongoose.model("Order", OrderSchema);