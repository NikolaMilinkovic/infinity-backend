const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================
// ExcelColumn Schema
// ============================
const ExcelColumnSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: {
        type: String,
        required: true,
        trim: true,
      },
      valueKey: {
        type: String,
        required: false,
        trim: true,
        default: '',
      },
    },
    options: {
      defaultValue: { type: String, default: '' },
      isAllCaps: { type: Boolean, default: false },
      format: { type: String },
    },
  },
  { _id: true }
);

// ============================
// Excel Schema
// ============================
const ExcelSchema = new Schema(
  {
    boutiqueId: {
      type: Schema.Types.ObjectId,
      ref: 'Boutique',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    columns: [ExcelColumnSchema],
  },
  { timestamps: true }
);

// Each boutique can’t have two presets with the same name
ExcelSchema.index({ boutiqueId: 1, name: 1 }, { unique: true });

// Fast lookups by boutique and default flag
ExcelSchema.index({ boutiqueId: 1, isDefault: 1 });

module.exports = mongoose.model('Excel', ExcelSchema);
