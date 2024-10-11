const express = require('express');

const { getProducts } = require('../controllers/productsController')
const { addDress, getAllActiveDresses, getAllInactiveDresses, deleteDress } = require('../controllers/different_products_cotrollers/dressesController');
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
router
  .route("/active-dresses/:id")
  .delete(deleteDress)
router
  .route("/inactive-dresses")
  .get(getAllInactiveDresses)
router
  .route("/inactive-dresses/:id")
  .delete(deleteDress)
// =======================[ \DRESSES ]=======================

// =======================[  ]=======================
// =======================[ \ ]=======================

// router
//   .route('/:id')
//   .put(updateProduct)
//   .delete(removeProduct)

module.exports = router;