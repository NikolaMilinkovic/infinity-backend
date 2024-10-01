const express = require('express');

const { getProducts, addProduct } = require('../controllers/productsController')
const router = new express.Router();

router
  .route("")
  .get(getProducts)

// router
//   .route('/:id')
//   .put(updateProduct)
//   .delete(removeProduct)

module.exports = router;