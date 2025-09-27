const CustomError = require('../utils/CustomError');
const mongoose = require('mongoose');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { LastUpdated } = require('../schemas/lastUpdated');

exports.getLastUpdatedData = async (req, res, next) => {
  try {
    const data = await LastUpdated.findOne({});
    return res.status(200).json({ message: 'Podaci o vremenima ažuriranja uspešno preuzeti', data: data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching last updated data', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja podataka o vremenima ažuriranja', statusCode, req)
    );
  }
};
