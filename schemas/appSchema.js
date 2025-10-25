const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appSchema = new Schema(
  {
    boutiqueName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    settings: {
      appIcon: {
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
    version: {
      type: String,
      required: false,
      unique: false,
      default: '1.0.0',
    },
    buildLink: {
      type: String,
      required: false,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSchema', appSchema);

const AppSettings = mongoose.model('AppSettings', appSchema);
async function initializeAppSettings() {
  try {
    const existingSettings = await AppSettings.findOne({});

    if (!existingSettings) {
      await AppSettings.create({});
    }
  } catch (error) {
    console.error('Error initializing app settings: ', error);
  }
}

module.exports = {
  AppSettings,
  initializeAppSettings,
};
