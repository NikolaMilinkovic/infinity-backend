const express = require('express');
const { getAppSettings, updateAppSettings, getAppVersion } = require('../controllers/appController');
const router = new express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.route('/settings').get(getAppSettings);
router.route('/version').get(getAppVersion);

router.route('/update-global-settings').post(upload.single('appIcon'), updateAppSettings);

module.exports = router;
