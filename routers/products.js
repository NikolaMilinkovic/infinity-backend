const express = require('express');

const { getProducts } = require('../controllers/productsController')
const { addDress, getAllActiveDresses } = require('../controllers/different_products_cotrollers/dressesController');
const router = new express.Router();

router
  .route("")
  .get(getProducts)


// =======================[ DRESSES ]=======================
router
  .route("/dress")
  .post(addDress)
router
  .route("/active-dresses")
  .get(getAllActiveDresses)
// =======================[ \DRESSES ]=======================

// =======================[  ]=======================
// =======================[ \ ]=======================

// router
//   .route('/:id')
//   .put(updateProduct)
//   .delete(removeProduct)

module.exports = router;