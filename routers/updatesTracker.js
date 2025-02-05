const express = require('express');
const router = new express.Router();
const { getLastUpdatedData } = require('../controllers/lastUpdatedController');

router
  .route("/get-last-updated-data")
  .get(getLastUpdatedData)

module.exports = router;