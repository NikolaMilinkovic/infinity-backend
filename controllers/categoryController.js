const CustomError = require('../utils/CustomError');
const Category = require('../schemas/category');
const Color = require('../schemas/color');
const { betterErrorLog } = require('../utils/logMethods');
const { updateLastUpdatedField } = require('../utils/helperMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

// GET
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    betterErrorLog('> Error while fetching categories:', error);
    return next(new CustomError('There was an error while fetching categories', 500, req));
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
    const addedCategory = await newCategory.save();
    const io = req.app.locals.io;

    if (io) {
      updateLastUpdatedField('categoryLastUpdatedAt', io);
      io.emit('categoryAdded', newCategory);
    }

    res.status(200).json({ message: `Kategorija ${category.name} je uspešno dodata`, category: newCategory });
    await writeToLog(req, `[CATEGORIES] Added a category [${addedCategory._id}] [${addedCategory.name}].`);
  } catch (error) {
    if (error.code === 11000) {
      return next(new CustomError(`Kategorija ${error.keyValue.name} već postoji`, 409, req));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while adding a new category:', error);
    return next(
      new CustomError('Došlo je do problema prilikom dodavanja kategorije', statusCode, req, {
        category: req.body.category,
      })
    );
  }
};

// DELETE
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return next(new CustomError(`Kategorija sa ID: ${id} nije pronađena`, 404, req));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('categoryLastUpdatedAt', io);
      io.emit('categoryRemoved', deletedCategory._id);
    }

    res.status(200).json({ message: `Kategorija ${deletedCategory.name} je uspešno obrisana`, color: deletedCategory });
    await writeToLog(req, `[CATEGORIES] Deleted a category [${deletedCategory._id}] [${deletedCategory.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while deleting a category:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja kategorije', statusCode, req, { id: req.params.id })
    );
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
      message: `Kategorija uspešno sačuvana kao ${name}`,
      category: updatedCategory,
    });
    await writeToLog(
      req,
      `Updated a category [${updatedCategory._id}] to [${updatedCategory.name}] [${updatedCategory.stockType}].`
    );
  } catch (error) {
    betterErrorLog('> Error while updating a category:', error);
    return next(
      new CustomError('There was an error while updating category', 500, req, {
        name: req.body.name,
        stockType: req.params.stockType,
        id: req.params.id,
      })
    );
  }
};
