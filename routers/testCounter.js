const express = require('express');
const router = new express.Router();

const { getCounter, updateCounter } = require('../controllers/testCounterController');

router
  .route("")
  .get(getCounter)
  .post(updateCounter)

module.exports = router;