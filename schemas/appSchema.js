const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appSchema = new Schema({
  settings: {
    defaults: {
      courier: {
        type: String,
        required: false,
        default: 'Bex'
      }
    }
  },
  version: {
    type: Number,
    required: false,
    unique: false,
    default: 1.0,
  },
}, { timestamps: true }); 

module.exports = mongoose.model('AppSchema', appSchema);

const AppSettings = mongoose.model('AppSettings', appSchema);
async function initializeAppSettings(){
  try{
    const existingSettings = await AppSettings.findOne({});

    if(!existingSettings) {
      await AppSettings.create({});
    }
  } catch (error) {
    console.error('Error initializing app settings: ', error);
  }
}

module.exports = {
  AppSettings,
  initializeAppSettings
};