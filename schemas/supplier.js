const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SupplierSchema = new Schema({
  name: { type: String, required: [true, 'Supplier name is required.'] },
});

module.exports = mongoose.model("Supplier", SupplierSchema);