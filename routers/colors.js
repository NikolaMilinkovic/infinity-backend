const express = require('express');
const { getColors, addColor, deleteColor, updateColor } = require('../controllers/colorsController');
const router = new express.Router();

router
  .route("/")
  .get(getColors)
  .post(addColor)

router
  .route("/:id")
  .delete(deleteColor)
  .patch(updateColor)


module.exports = router;