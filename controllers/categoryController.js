const CustomError = require('../utils/CustomError');
const Category = require('../schemas/category');
const Color = require('../schemas/color');
const { betterErrorLog } = require('../utils/logMethods');
const { updateLastUpdatedField } = require('../utils/helperMethods');

// GET
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    betterErrorLog('> Error while fetching categories:', error);
    return next(new CustomError('There was an error while fetching categories', 500));
  }
};

// ADD
exports.addCategory = async (req, res, next) => {
  try {
    const { category } = req.body;
    const newCategory = new Category({
      name: category.name,
      stockType: category.stockType,
    });
    const response = await newCategory.save();
    const io = req.app.locals.io;

    if (io) {
      updateLastUpdatedField('categoryLastUpdatedAt', io);
      io.emit('categoryAdded', newCategory);
    }

    res.status(200).json({ message: `Kategorija ${category.name} je uspesno dodata`, category: newCategory });
  } catch (error) {
    if (error.code === 11000) {
      return next(new CustomError(`Kategorija ${error.keyValue.name} vec postoji`, 409));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while adding a new category:', error);
    return next(new CustomError('Doslo je do problema prilikom dodavanja kategorije', statusCode));
  }
};

// DELETE
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return next(new CustomError(`Kategorija sa ID: ${id} nije pronadjena`, 404));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('categoryLastUpdatedAt', io);
      io.emit('categoryRemoved', deletedCategory._id);
    }

    res.status(200).json({ message: `Kategorija ${deletedCategory.name} je uspesno obrisana`, color: deletedCategory });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while deleting a category:', error);
    return next(new CustomError('Doslo je do problema prilikom brisanja kategorije', statusCode));
  }
};

// UPDATE
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, stockType } = req.body;
    const { id } = req.params;
    const updatedCategory = await Category.findByIdAndUpdate(id, { name, stockType }, { new: true });

    // Handle socket update
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('categoryLastUpdatedAt', io);
      io.emit('categoryUpdated', updatedCategory);
    }

    // Send a response
    res.status(200).json({
      message: `Kategorija uspesno sačuvana kao ${name}`,
      category: updatedCategory,
    });
  } catch (error) {
    betterErrorLog('> Error while updating a category:', error);
    return next(new CustomError('There was an error while updating category', 500));
  }
};
