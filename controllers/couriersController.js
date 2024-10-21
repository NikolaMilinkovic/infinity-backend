const Courier = require('../schemas/courier');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { getSocketInstance } = require('../utils/socket');


// GET ALL COURIERS
exports.getCouriers = async(req, res, next) => {
  try{
    const couriers = await Courier.find();
    res.status(200).json(couriers);
  } catch(error){
    betterErrorLog('> Error getting all couriers:', error);
    return next(new CustomError('There was an error while fetching couriers', 500));
  }
}

// ADD NEW COURIER
exports.addCourier = async(req, res, next) => {
  try{
    const { courier } = req.body;
    const newCourier = new Courier({
      name: courier.name,
      deliveryPrice: courier.deliveryPrice
    })

    const response = await newCourier.save();
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for new courier: ', newCourier.name);
      io.emit('courierAdded', newCourier);
    }
  
    res.status(200).json({ message: `Kurir ${courier.name} je uspešno dodat`, courier: newCourier });
  } catch(error){
    if (error.code === 11000) {
      return next(new CustomError(`Kurir ${error.keyValue.name} već postoji`, 409));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new courier:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja kurira', statusCode));
  }
}

// UPDATE A COURIER
exports.updateCourier = async(req, res, next) => {
  try{
    const { name, deliveryPrice } = req.body;
    const { id } = req.params;
    const updatedCourier = await Courier.findByIdAndUpdate(
      id,
      { name, deliveryPrice },
      { new: true }
    );

    // Handle socket update
    const io = getSocketInstance();
    if (io) {
      console.log('> Emitting an update to all devices for courier update: ', updatedCourier.name);
      io.emit('courierUpdated', updatedCourier);
    }

    res.status(200).json({
      message: `Kurir ${name} uspešno sačuvan`,
      courier: updatedCourier,
    });
  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a courier:', error);
    return next(new CustomError('Do[lo je do problema prilikom promene kurira', statusCode));
  }
}

// DELETE A COURIER
exports.deleteCourier = async(req, res, next) => {
  try{
    const { id } = req.params;
    const deleterCourier = await Courier.findByIdAndDelete(id);
    if(!deleterCourier){
      return next(new CustomError(`Kurir sa ID: ${id} nije pronadjen`, 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for courier deletion: ', deleterCourier.name);
      io.emit('courierRemoved', deleterCourier._id);
    }

    res.status(200).json({ message: `Kurir ${deleterCourier.name} je uspešno obrisan`, courier: deleterCourier });

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a courier:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja kurira', statusCode));
  }
}