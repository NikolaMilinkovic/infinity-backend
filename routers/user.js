const express = require('express');
const router = new express.Router();

 const { getUserData, updateUserData } = require('../controllers/userController');

router
  .route('/data')
  .get(getUserData)

router
  .route('/update-settings')
  .post(updateUserData)

module.exports = router;