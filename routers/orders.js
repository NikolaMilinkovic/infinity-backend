const express = require('express');
const router = new express.Router();
const { parseOrder } = require('../controllers/ordersController');
 
router
  .route("/parse")
  .post(parseOrder)

module.exports = router;