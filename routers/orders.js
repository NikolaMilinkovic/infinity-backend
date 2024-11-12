const express = require('express');
const router = new express.Router();
const { parseOrder, addOrder, getProcessedOrders, getUnprocessedOrders, removeOrdersBatch, getOrdersByDate, updateOrder, setIndicatorToTrue, setIndicatorToFalse, packOrdersByIds, getReservations, getReservationsByDate, batchReservationsToCourier } = require('../controllers/ordersController');
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
  .route("/fetch-reservations-by-date/:date")
  .get(getReservationsByDate)

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

router
  .route("/packed/set-indicator-to-true/:id")
  .post(setIndicatorToTrue)

router
  .route("/packed/set-indicator-to-false/:id")
  .post(setIndicatorToFalse)

router
  .route("/pack-orders")
  .post(packOrdersByIds)

router
  .route("/reservations-to-orders")
  .post(batchReservationsToCourier)

module.exports = router;