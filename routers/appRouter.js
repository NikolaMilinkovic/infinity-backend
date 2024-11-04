const express = require('express');
const { getAppSettings } = require('../controllers/appController');
const router = new express.Router();
 
router
  .route("/settings")
  .get(getAppSettings)

module.exports = router;