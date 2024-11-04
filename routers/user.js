const express = require('express');
const router = new express.Router();

 const { getUserData } = require('../controllers/userController');

router
  .route('/data')
  .get(getUserData)
  // .post(setUserData)

module.exports = router;