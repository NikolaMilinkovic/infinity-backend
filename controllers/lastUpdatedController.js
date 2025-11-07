const CustomError = require('../utils/CustomError');
const mongoose = require('mongoose');
const { betterErrorLog } = require('../utils/logMethods');
const { LastUpdated } = require('../schemas/lastUpdated');

exports.getLastUpdatedData = async (req, res, next) => {
  try {
    const boutiqueId = req.user.boutiqueId;
    const data = await LastUpdated.findOne({ boutiqueId });
    if (!data) {
      return next(
        new CustomError(
          `Last Updated fajl nije pronađen! Automatsko ažuriranje na reconnect korisnika nije moguće!`,
          404,
          req,
          { boutiqueId }
        )
      );
    }
    return res.status(200).json({ message: 'Podaci o vremenima ažuriranja uspešno preuzeti', data: data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching last updated data', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja podataka o vremenima ažuriranja', statusCode, req)
    );
  }
};
