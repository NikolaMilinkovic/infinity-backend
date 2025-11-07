const Supplier = require('../schemas/supplier');
const CustomError = require('../utils/CustomError');
const { updateLastUpdatedField, getBoutiqueId } = require('../utils/helperMethods');
const { betterErrorLog } = require('../utils/logMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

// GET ALL SUPPLIERS
exports.getSuppliers = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const suppliers = await Supplier.find({ boutiqueId });
    res.status(200).json(suppliers);
  } catch (error) {
    betterErrorLog('> Error fetchin suppliers:', error);
    return next(new CustomError('There was an error while fetching suppliers', 500, req));
  }
};

// ADD NEW SUPPLIER
exports.addSupplier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { supplier } = req.body;
    const supplierExists = await Supplier.findOne({ name: supplier.name, boutiqueId });
    if (supplierExists) return res.status(409).json({ message: `Dobavljač ${supplier.name} već postoji.` });
    const newSupplier = new Supplier({
      boutiqueId,
      name: supplier.name,
    });

    const addedSupplier = await newSupplier.save();
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('supplierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('supplierAdded', newSupplier);
    }

    res.status(200).json({ message: `${newSupplier.name} je uspesno dodata`, supplier: newSupplier });

    await writeToLog(req, `[SUPPLIERS] Added a supplier [${addedSupplier._id}] with name [${addedSupplier.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new supplier:', error);
    return next(
      new CustomError('Doslo je do problema prilikom dodavanja dobavljača', statusCode, req, {
        supplier: req.body.supplier,
      })
    );
  }
};

// UPDATE A SUPPLIER
exports.updateSupplier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { name } = req.body;
    const { id } = req.params;
    const updatedSupplier = await Supplier.findOneAndUpdate({ _id: id, boutiqueId }, { name }, { new: true });

    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('supplierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('supplierUpdated', updatedSupplier);
    }

    res.status(200).json({
      message: `Dobavljač uspešno sačuvan kao ${name}`,
      supplier: updatedSupplier,
    });

    await writeToLog(
      req,
      `[SUPPLIERS] Updated a supplier [${updatedSupplier._id}] with name [${updatedSupplier.name}].`
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a supplier:', error);
    return next(
      new CustomError('Doslo je do problema prilikom promene dobavljača', statusCode, req, {
        supplierName: req.body.name,
        id: req.params.id,
      })
    );
  }
};

// DELETE A SUPPLIER
exports.deleteSupplier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { id } = req.params;
    const deletedSupplier = await Supplier.findOneAndDelete({ _id: id, boutiqueId });
    if (!deletedSupplier) {
      return next(new CustomError(`Dobavljač sa ID: ${id} nije pronadjen`, 404, req));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('supplierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('supplierRemoved', deletedSupplier._id);
    }

    res
      .status(200)
      .json({ message: `Dobavljač ${deletedSupplier.name} je uspešno obrisan`, supplier: deletedSupplier });

    await writeToLog(
      req,
      `[SUPPLIERS] Deleted a supplier [${deletedSupplier._id}] with name [${deletedSupplier.name}].`
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a supplier:', error);
    return next(
      new CustomError('Doslo je do problema prilikom brisanja dobavljača', statusCode, req, { id: req.params.id })
    );
  }
};
