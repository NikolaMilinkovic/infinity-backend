const Supplier = require('../schemas/supplier');
const CustomError = require('../utils/CustomError');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');

// GET ALL SUPPLIERS
exports.getSuppliers = async(req, res, next) => {
  try{
    const suppliers = await Supplier.find();
    res.status(200).json(suppliers);
  } catch(error){
    betterErrorLog('> Error fetchin suppliers:', error);
    return next(new CustomError('There was an error while fetching suppliers', 500));
  }
}

// ADD NEW SUPPLIER
exports.addSupplier = async(req, res, next) => {
  try{
    const { supplier } = req.body;
    const newSupplier = new Supplier({
      name: supplier.name,
    })

    const response = await newSupplier.save();
    const io = req.app.locals.io;
    if(io){
      console.log('> Emiting an update to all devices for new supplier: ', newSupplier.name);
      io.emit('supplierAdded', newSupplier);
    }
  
    res.status(200).json({ message: `${newSupplier.name} je uspesno dodata`, supplier: newSupplier });
  } catch(error){
    if (error.code === 11000) {
      return next(new CustomError(`${error.keyValue.name} već postoji`, 409));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new supplier:', error);
    return next(new CustomError('Doslo je do problema prilikom dodavanja dobavljača', statusCode));
  }
}

// UPDATE A SUPPLIER
exports.updateSupplier = async(req, res, next) => {
  try{
    console.log('> Update supplier called..');
    const { name } = req.body;
    const { id } = req.params;
    betterConsoleLog('> Name is', name)
    betterConsoleLog('> ID is', id)
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    const io = req.app.locals.io;
    if (io) {
      console.log('> Emitting an update to all devices for supplier update: ', updatedSupplier.name);
      io.emit('supplierUpdated', updatedSupplier);
    }

    res.status(200).json({
      message: `Dobavljač uspešno sačuvan kao ${name}`,
      supplier: updatedSupplier,
    });
  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a supplier:', error);
    return next(new CustomError('Doslo je do problema prilikom promene dobavljača', statusCode));
  }
}

// DELETE A SUPPLIER
exports.deleteSupplier = async(req, res, next) => {
  try{
    const { id } = req.params;
    const deletedSupplier = await Supplier.findByIdAndDelete(id);
    if(!deletedSupplier){
      return next(new CustomError(`Dobavljač sa ID: ${id} nije pronadjen`, 404));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if(io){
      console.log('> Emiting an update to all devices for supplier deletion: ', deletedSupplier.name);
      io.emit('supplierRemoved', deletedSupplier._id);
    }

    res.status(200).json({ message: `Dobavljač ${deletedSupplier.name} je uspešno obrisan`, supplier: deletedSupplier });

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a supplier:', error);
    return next(new CustomError('Doslo je do problema prilikom brisanja dobavljača', statusCode));
  }
}