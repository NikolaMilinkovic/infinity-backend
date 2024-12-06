const express = require('express');

const { getSuppliers, addSupplier, deleteSupplier, updateSupplier } = require('../controllers/supplierController');
const router = new express.Router();

router
  .route("/")
  .get(getSuppliers)
  .post(addSupplier)

router
  .route("/:id")
  .delete(deleteSupplier)
  .patch(updateSupplier)

module.exports = router;