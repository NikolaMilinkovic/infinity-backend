const express = require('express');
const router = new express.Router();

const {
  getUserData,
  updateUserSettings,
  updateUserPushToken,
  addUser,
  updateUser,
  removeUser,
} = require('../controllers/userController');

router.route('/data').get(getUserData);

router.route('/update-user-settings').post(updateUserSettings);

router.route('/add-user').post(addUser);
router.route('/update-user').post(updateUser);
router.route('/remove-user').delete(removeUser);

router.route('/update-user-push-token').post(updateUserPushToken);

module.exports = router;
