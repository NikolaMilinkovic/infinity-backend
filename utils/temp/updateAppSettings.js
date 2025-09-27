// const { AppSettings } = require('../../schemas/appSettings'); // adjust path
const { AppSettings } = require('../../schemas/appSchema');
const mongoose = require('mongoose');

const updateAppSettingsSchema = async () => {
  try {
    console.log('Starting AppSettings schema update...');

    // Get the existing AppSettings document
    const appSettings = await AppSettings.findOne({});

    if (!appSettings) {
      console.log('No AppSettings document found!');
      return;
    }

    console.log(`Found AppSettings document: ${appSettings._id}`);

    const updateData = {};
    let needsUpdate = false;

    // Check if appIcon is missing from settings
    if (!appSettings.settings.appIcon) {
      updateData['settings.appIcon'] = {
        appIconUri: '',
        appIconName: '',
      };
      needsUpdate = true;
      console.log('Adding missing appIcon field');
    } else {
      // Check if appIcon fields are missing
      if (!appSettings.settings.appIcon.appIconUri) {
        updateData['settings.appIcon.appIconUri'] = '';
        needsUpdate = true;
        console.log('Adding missing appIconUri field');
      }
      if (!appSettings.settings.appIcon.appIconName) {
        updateData['settings.appIcon.appIconName'] = '';
        needsUpdate = true;
        console.log('Adding missing appIconName field');
      }
    }

    // Ensure buildLink exists (it should be at root level)
    if (!appSettings.buildLink) {
      updateData.buildLink = '';
      needsUpdate = true;
      console.log('Adding missing buildLink field');
    }

    // Update the document if needed
    if (needsUpdate) {
      await AppSettings.findByIdAndUpdate(appSettings._id, updateData);
      console.log('✅ AppSettings updated successfully!');

      // Show the updated document
      const updatedSettings = await AppSettings.findById(appSettings._id);
      console.log('Updated AppSettings:', JSON.stringify(updatedSettings, null, 2));
    } else {
      console.log('✅ AppSettings already up to date!');
    }
  } catch (error) {
    console.error('❌ AppSettings update failed:', error);
  }
};

module.exports = updateAppSettingsSchema;
