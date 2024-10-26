const CustomError = require("../../utils/CustomError");
const { getSocketInstance } = require('../../utils/socket');
const Dress = require("../../schemas/dress");
const DressColor = require("../../schemas/dressColor");
const Purse = require("../../schemas/purse")
const PurseColor = require("../../schemas/purseColor")
const { uploadMediaToS3, deleteMediaFromS3 } = require("../../utils/s3/s3Methods");
const { betterErrorLog, betterConsoleLog } = require("../../utils/logMethods");
const { removePurseById } = require("../../utils/PurseStockMethods");
const { removeDressById } = require("../../utils/dressStockMethods");

exports.removeProductBatch = async (req, res, next) => {
  try{
    const data = req.body;
    betterConsoleLog('> Logging out data:', data);
  
    for(const item of data){
      console.log('> Deleting for item', item._id, item.stockType);
      if(item.stockType === 'Boja-Veličina-Količina'){
        await removeDressById(item._id);
      }
      if(item.stockType === 'Boja-Količina'){
        await removePurseById(item._id);
      }
    }
  
    res.status(200).json({ message: 'Svi izabrani artikli su uspešno obrisani' });

  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during batch delete:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja proizvoda', statusCode)); 
  }
}

exports.updateProduct = async (req, res, next) => {
  try{
    console.log('> Update product called.')
    const data = req.body;
    const { id } = req.params;
    console.log('> Sent Id is' + id);
    betterConsoleLog('> Data is:', data);

    res.status(200).json({ message: 'Proizvod uspešno izmenjen i sačuvan' });

  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during product update:', error);
    return next(new CustomError('Došlo je do problema prilikom updejtovanja proizvoda', statusCode)); 
  }
}