const Courier = require('../schemas/courier');
const CustomError = require('../utils/CustomError');
const { betterErrorLog } = require('../utils/logMethods');
const { updateLastUpdatedField, getBoutiqueId } = require('../utils/helperMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

// GET ALL COURIERS
exports.getCouriers = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const couriers = await Courier.find({ boutiqueId });
    res.status(200).json(couriers);
  } catch (error) {
    betterErrorLog('> Error getting all couriers:', error);
    return next(new CustomError('There was an error while fetching couriers', 500, req));
  }
};

// ADD NEW COURIER
exports.addCourier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { courier } = req.body;
    const courierExists = await Courier.findOne({ name: courier.name, boutiqueId });
    if (courierExists) return res.status(409).json({ message: `Kurir ${courier.name} već postoji.` });
    const newCourier = new Courier({
      boutiqueId,
      name: courier.name,
      deliveryPrice: courier.deliveryPrice,
    });

    const response = await newCourier.save();
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('courierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('courierAdded', newCourier);
    }

    res.status(200).json({ message: `Kurir ${courier.name} je uspešno dodat`, courier: newCourier });
    await writeToLog(req, `[COURIERS] Added a new courier [${response._id}] [${courier.name}].`);
  } catch (error) {
    if (error.code === 11000) {
      return next(new CustomError(`Kurir ${error.keyValue.name} već postoji`, 409, req));
    }
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new courier:', error);
    return next(
      new CustomError('Došlo je do problema prilikom dodavanja kurira', statusCode, req, { courier: req.body.courier })
    );
  }
};

// UPDATE A COURIER
exports.updateCourier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { name, deliveryPrice } = req.body;
    const { id } = req.params;
    const updatedCourier = await Courier.findOneAndUpdate(
      { _id: id, boutiqueId },
      { name, deliveryPrice },
      { new: true }
    );

    // Handle socket update
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('courierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('courierUpdated', updatedCourier);
    }

    res.status(200).json({
      message: `Kurir ${name} uspešno sačuvan`,
      courier: updatedCourier,
    });

    await writeToLog(req, `[COURIERS] Updated a courier [${updatedCourier._id}] to [${updatedCourier.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error updating a courier:', error);
    return next(
      new CustomError('Do[lo je do problema prilikom promene kurira', statusCode, req, {
        name: req.body.name,
        deliveryPrice: req.body.deliveryPrice,
        id: req.params.id,
      })
    );
  }
};

// DELETE A COURIER
exports.deleteCourier = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { id } = req.params;
    const deletedCourier = await Courier.findOneAndDelete({ _id: id, boutiqueId });
    if (!deletedCourier) {
      return next(new CustomError(`Kurir sa ID: ${id} nije pronadjen`, 404, req));
    }

    // SOCKET HANDLING
    const io = req.app.locals.io;
    if (io) {
      await updateLastUpdatedField('courierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('courierRemoved', deletedCourier._id);
    }

    res.status(200).json({ message: `Kurir ${deletedCourier.name} je uspešno obrisan`, courier: deletedCourier });
    await writeToLog(req, `[COURIERS] Deleted a courier [${deletedCourier._id}] [${deletedCourier.name}].`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error deleting a courier:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja kurira', statusCode, req, { id: req.params.id })
    );
  }
};
