const express = require('express');
const router = new express.Router();

const { getUserData, updateUserSettings, updateUserPushToken } = require('../controllers/userController');

router.route('/data').get(getUserData);

router.route('/update-user-settings').post(updateUserSettings);

router.route('/update-user-push-token').post(updateUserPushToken);

module.exports = router;
