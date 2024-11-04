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
  }
});

module.exports = mongoose.model('AppSchema', appSchema);

const AppSettings = mongoose.model('AppSettings', appSchema);
async function initializeAppSettings(){
  try{
    const existingSettings = await AppSettings.findOne({});

    if(!existingSettings) {
      await AppSettings.create({});
    }
  } catch (error) {
    console.error('Error initializing app settings: ', settings);
  }
}

module.exports = {
  AppSettings,
  initializeAppSettings
};