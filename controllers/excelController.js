const Excel = require('../schemas/excellSchema');
const Courier = require('../schemas/courier');
const CustomError = require('../utils/CustomError');
const { getBoutiqueId, updateLastUpdatedField } = require('../utils/helperMethods');
const { betterConsoleLog, betterErrorLog } = require('../utils/logMethods');
const { writeToLog } = require('../utils/s3/S3Methods');

exports.AddCourierExcelPreset = async (req, res, next) => {
  try {
    const data = req.body;
    const boutiqueId = getBoutiqueId(req);
    const cleanColumns = data.columns.map((col) => {
      const { temp_id, ...rest } = col;
      return rest;
    });

    const newExcelPreset = new Excel({
      boutiqueId,
      name: data.name,
      isDefault: data.isDefault,
      columns: cleanColumns,
    });
    const newExcel = await newExcelPreset.save();

    // Update
    const io = req.app.locals.io;
    await updateLastUpdatedField('excelPresetLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('addExcelPreset', newExcel);
    res.status(200).json({ message: 'Šablon uspešno kreiran' });

    // Dodati podatke o dodatom excelu
    await writeToLog(req, `[EXCEL] Added a new excel preset [${newExcel.name}] | _id [${newExcel._id}].`);
  } catch (error) {
    betterErrorLog('> Error adding an Excel preset', error);
    return next(new CustomError('There was an error while adding new Excel preset', 500, req));
  }
};

exports.UpdateCourierExcelPreset = async (req, res, next) => {
  try {
    const updatedExcelData = req.body;
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);
    const cleanColumns = updatedExcelData.columns.map((col) => {
      const { temp_id, ...rest } = col;
      return rest;
    });
    const excel = await Excel.findById(id);
    if (!excel) {
      return next(new CustomError('Excel šema nije pronađena', 404, req));
    }

    excel.name = updatedExcelData.name;
    excel.isDefault = updatedExcelData.isDefault;
    excel.columns = cleanColumns;
    const updatedExcel = await excel.save();

    // Update
    const io = req.app.locals.io;
    await updateLastUpdatedField('excelPresetLastUpdatedAt', io, boutiqueId);
    io.to(`boutique-${boutiqueId}`).emit('updateExcelPreset', updatedExcel);
    res.status(200).json({ message: 'Šablon uspešno ažuriran' });

    await writeToLog(req, `[EXCEL] Updated an excel preset [${updatedExcel.name}] | _id [${updatedExcel._id}].`);
  } catch (error) {
    betterErrorLog('> Error updating an Excel preset', error);
    return next(new CustomError('There was an error while updating new Excel preset', 500, req));
  }
};

exports.RemoveCourierExcelPreset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);
    const deletedExcelPreset = await Excel.findOneAndDelete({ _id: id, boutiqueId });
    await Courier.updateMany({ boutiqueId, excelSchemaId: id }, { $set: { excelSchemaId: null } });
    if (!deletedExcelPreset) {
      return next(new CustomError(`Šablon sa ID: ${id} nije pronadjen`, 404, req, { id: req.params.id }));
    }

    const io = req.app.locals.io;
    if (io) {
      updateLastUpdatedField('excelPresetLastUpdatedAt', io, boutiqueId);
      updateLastUpdatedField('courierLastUpdatedAt', io, boutiqueId);
      io.to(`boutique-${boutiqueId}`).emit('removeExcelPreset', deletedExcelPreset._id);
    }

    res.status(200).json({ message: `${deletedExcelPreset.name} šablon je uspešno obrisan` });
    await writeToLog(req, `[EXCEL] Deleted an excel preset [${deletedExcelPreset._id}] [${deletedExcelPreset.name}].`);
  } catch (error) {
    betterErrorLog('> Error deleting Excel preset:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja Excel šablona]', statusCode, req, { id: req.params.id })
    );
  }
};

exports.GetCourierExcelPresets = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const excels = await Excel.find({ boutiqueId });
    res.status(200).json(excels);
  } catch (error) {
    betterErrorLog('> Error getting all courier excels:', error);
    return next(new CustomError('There was an error while fetching courier excels', 500, req));
  }
};
