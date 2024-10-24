const express = require('express');
const router = new express.Router();
const { parseOrder, addOrder, getProcessedOrders, getUnprocessedOrders } = require('../controllers/ordersController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
 
// Extracts user data nad populates correct fields via GPT
router
  .route("/parse")
  .post(parseOrder)

router
  .route("/")
  .post(upload.single('profileImage'), addOrder)

router
  .route("/unprocessed")
  .get(getUnprocessedOrders)

router
  .route("/processed")
  .get(getProcessedOrders)

module.exports = router;