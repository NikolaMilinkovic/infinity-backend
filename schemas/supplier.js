const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SupplierSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
    },
    name: { type: String, required: [true, 'Supplier name is required.'] },
  },
  { timestamps: true }
);

SupplierSchema.index({ boutiqueId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Supplier', SupplierSchema);
