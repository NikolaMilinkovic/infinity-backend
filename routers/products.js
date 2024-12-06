const express = require('express');

const { getProducts } = require('../controllers/productsController')
const { 
  addDress, 
  getAllActiveDresses, 
  getAllInactiveDresses, 
  deleteDress 
} = require('../controllers/different_products_cotrollers/dressesController');

const {
  addPurse,
  getAllActivePurses,
  getAllInactivePurses,
  deletePurse
} = require('../controllers/different_products_cotrollers/pursesController');

const { removeProductBatch, updateProduct, updateDisplayPriority } = require('../controllers/different_products_cotrollers/genericProductController')
const router = new express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router
  .route("")
  .get(getProducts)

router
  .route("/delete-item-batch")
  .delete(removeProductBatch)

router
  .route("/update/:id")
  .put(upload.single('image'), updateProduct)

router
  .route('/update-display-priority')
  .post(updateDisplayPriority)


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
  .route("/inactive-dresses")
  .get(getAllInactiveDresses)
// =======================[ \DRESSES ]=======================


// =======================[ PURSES ]=======================
router
  .route("/purse/:id")
  .delete(deletePurse)
router
  .route("/purse")
  .post(upload.single('image'), addPurse);
router
  .route("/active-purses")
  .get(getAllActivePurses)
router
  .route("/inactive-purses")
  .get(getAllInactivePurses)
// =======================[ \PURSES ]=======================
module.exports = router;