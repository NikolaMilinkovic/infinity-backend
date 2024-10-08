const express = require('express');
const router = new express.Router();
const { getCategories, addCategory, deleteCategory, updateCategory } = require('../controllers/categoryController');
 
router
  .route("/")
  .get(getCategories)
  .post(addCategory)

router
  .route("/:id")
  .delete(deleteCategory)
  .patch(updateCategory)


module.exports = router;