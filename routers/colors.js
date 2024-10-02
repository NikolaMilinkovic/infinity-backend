const express = require('express');
const { getColors, addColor, deleteColor } = require('../controllers/colorsController');
const router = new express.Router();

router
  .route("/")
  .get(getColors)
  .post(addColor)

router
  .route("/:id")
  .delete(deleteColor)


module.exports = router;