const express = require('express');

const { getProducts } = require('../controllers/productsController')
const { addDress, getAllActiveDresses, getAllInactiveDresses, deleteDress } = require('../controllers/different_products_cotrollers/dressesController');
const router = new express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router
  .route("")
  .get(getProducts)


// =======================[ DRESSES ]=======================
router
  .route("/dress/:id")
  .delete(deleteDress)
router
  .route("/dress")
  .post(upload.single('image'), addDress);
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
module.exports = router;