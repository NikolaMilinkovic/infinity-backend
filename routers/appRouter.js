const express = require('express');
const { getAppSettings, updateAppSettings } = require('../controllers/appController');
const router = new express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.route('/settings').get(getAppSettings);

router.route('/update-global-settings').post(upload.single('appIcon'), updateAppSettings);

module.exports = router;
