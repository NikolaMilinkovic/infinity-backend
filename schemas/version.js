const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Version = new Schema(
  {
    version: {
      type: String,
      required: false,
      unique: false,
      default: '1.0.0',
    },
    buildLinkAndroid: {
      type: String,
      required: false,
      default: '',
    },
    buildLinkIOS: {
      type: String,
      required: false,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Version', Version);
