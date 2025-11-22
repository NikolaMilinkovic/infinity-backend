const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Boutique = new Schema(
  {
    boutiqueName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    billingDue: {
      type: Date,
      required: false,
      default: null,
    },
    lastUpdatedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LastUpdated',
      required: false,
    },
    settings: {
      appIcon_on_white_background: {
        appIconUri: {
          type: String,
          required: false,
          default: '',
        },
        appIconName: {
          type: String,
          required: false,
          default: '',
        },
      },
      appIcon_on_black_background: {
        appIconUri: {
          type: String,
          required: false,
          default: '',
        },
        appIconName: {
          type: String,
          required: false,
          default: '',
        },
      },
      orders: {
        requireBuyerImage: {
          type: Boolean,
          required: false,
          default: false,
        },
      },
      defaults: {
        courier: {
          type: String,
          required: false,
          default: '',
        },
        listProductsBy: {
          type: String,
          required: false,
          default: 'category',
        },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Boutique', Boutique);
