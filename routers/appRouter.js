const express = require('express');
const {
  getAppSettings,
  updateAppSettings,
  getAppVersion,
  updateBoutiqueData,
} = require('../controllers/appController');
const router = new express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.route('/settings').get(getAppSettings);
router.route('/version').get(getAppVersion);

router.route('/update-global-settings').post(
  upload.fields([
    { name: 'appIcon_on_white_background', maxCount: 1 },
    { name: 'appIcon_on_black_background', maxCount: 1 },
  ]),
  updateAppSettings
);
router.route('/update-boutique').post(updateBoutiqueData);

module.exports = router;
