const express = require('express');
const { getCouriers, addCourier, deleteCourier, updateCourier } = require('../controllers/couriersController');
const router = new express.Router();

router
  .route("/")
  .get(getCouriers)
  .post(addCourier)

router
  .route("/:id")
  .delete(deleteCourier)
  .patch(updateCourier)


module.exports = router;