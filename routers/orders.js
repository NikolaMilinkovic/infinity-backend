const express = require('express');
const router = new express.Router();
const { parseOrder, addOrder, getProcessedOrders, getUnprocessedOrders, removeOrdersBatch, getOrdersByDate, updateOrder } = require('../controllers/ordersController');
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
  .route("/fetch-by-date/:date")
  .get(getOrdersByDate)

router
  .route("/unprocessed")
  .get(getUnprocessedOrders)

router
  .route("/processed")
  .get(getProcessedOrders)

router
  .route("/remove-orders-batch")
  .delete(removeOrdersBatch)

router
  .route("/update/:id")
  .patch(upload.single('profileImage'), updateOrder)

module.exports = router;