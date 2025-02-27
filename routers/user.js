const express = require('express');
const router = new express.Router();

 const { getUserData, updateUserSettings } = require('../controllers/userController');

router
  .route('/data')
  .get(getUserData)

router
  .route('/update-user-settings')
  .post(updateUserSettings)

module.exports = router;