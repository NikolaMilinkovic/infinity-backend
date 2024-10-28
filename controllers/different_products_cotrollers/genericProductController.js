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
    console.log('> Update product called')
    const {
      previousStockType,
      active,
      name,
      price,
      category,
      stockType,
      colors
    } = req.body;
    const { id } = req.params;
    const io = getSocketInstance();

    let product;
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    const newImageData = req.file;
    let image;


    // FETCH THE PRODUCT
    if(previousStockType === 'Boja-Veličina-Količina'){
      product = await Dress.findById(id);
    }
    if(previousStockType === 'Boja-Količina'){
      product = await Purse.findById(id);
    }
    if (newImageData) {
      // If an image is uploaded, handle it
      if (newImageData.imageName === product.image.imageName) {
        image = product.image; // Keep the current image if it's unchanged
      } else {
        image = await uploadMediaToS3(req.file, next);
        await deleteMediaFromS3(product.image.imageName); // Delete the old image
      }
    } else {
      // If no new image is provided, keep the existing image
      image = product.image;
    }
    if(!product) return res.status(404).json({ message: 'Prizvod nije pronađen u bazi podataka za id: '+ id });

    // COMPARE PRODUCT STOCK TYPE
    if(stockType !== previousStockType){
      const colorIdsForDeletion = product.colors;
      // DIFFERENT STOCK TYPE
      // Remove all product color objects & remove the product | Socket update clients
      if(product.stockType === 'Boja-Veličina-Količina'){
        await DressColor.deleteMany({ _id: { $in: colorIdsForDeletion }});
        await Dress.findByIdAndDelete(product._id);
        if(io){
          if(product.active){
            io.emit('activeDressRemoved', product._id);
            io.emit('activeProductRemoved', product._id);
          } else {
            io.emit('inactiveDressRemoved', product._id);
            io.emit('inactiveProductRemoved', product._id);
          }
        }

        // INSERT PURSE DATA
        const insertedColors = await PurseColor.insertMany(colorsArray);
        const colorIds = insertedColors.map((color) => color._id);
        const newPurse = new Purse({
          name: name,
          active: active,
          category: category,
          stockType: stockType,
          price: price,
          colors: colorIds,
          image: image,
        });
        const result = await newPurse.save();
        const populatedPurse = await Purse.findById(result._id).populate('colors');
        if(io){
          if(active){
            io.emit('activePurseAdded', populatedPurse);
            io.emit('activeProductAdded', populatedPurse);
          } else {
            io.emit('inactivePurseAdded', populatedPurse);
            io.emit('inactiveProductAdded', populatedPurse);
          }
        }
      }
      if(product.stockType === 'Boja-Količina'){
        await PurseColor.deleteMany({ _id: { $in: colorIdsForDeletion }});
        await Purse.findByIdAndDelete(product._id);
        if(io){
          if(product.active){
            io.emit('activePurseRemoved', product._id);
            io.emit('activeProductRemoved', product._id);
          } else {
            io.emit('inactivePurseRemoved', product._id);
            io.emit('inactiveProductRemoved', product._id);
          }
        }

        // INSERT DRESS DATA
        const insertedColors = await DressColor.insertMany(colorsArray);
        const colorIds = insertedColors.map((color) => color._id);
        const newDress = new Dress({
          name: name,
          active: active,
          category: category,
          stockType: stockType,
          price: price,
          colors: colorIds,
          image: image,
        });
    
        const result = await newDress.save();
        const populatedDress = await Dress.findById(result._id).populate('colors');
        if(io){
          if(active){
            io.emit('activeDressAdded', populatedDress);
            io.emit('activeProductAdded', populatedDress);
          } else {
            io.emit('inactiveDressAdded', populatedDress);
            io.emit('inactiveProductAdded', populatedDress);
          }
        }
      }

      return res.status(200).json({ message: 'Proizvod je uspešno ažuriran' });
    } else {
      const colorIdsForDeletion = product.colors;
      if(product.stockType === 'Boja-Veličina-Količina'){
        await DressColor.deleteMany({ _id: { $in: colorIdsForDeletion }});
        await Dress.findByIdAndDelete(product._id);
        if(io){
          if(product.active){
            io.emit('activeProductRemoved', product._id);
            io.emit('activeDressRemoved', product._id);
          } else {
            io.emit('inactiveProductRemoved', product._id);
            io.emit('inactiveDressRemoved', product._id);
          }
        }
        const insertedColors = await DressColor.insertMany(colorsArray);
        const colorIds = insertedColors.map((color) => color._id);
        const newDress = new Dress({
          name: name,
          active: active,
          category: category,
          stockType: stockType,
          price: price,
          colors: colorIds,
          image: image,
        });
    
        const result = await newDress.save();
        const populatedDress = await Dress.findById(result._id).populate('colors');
        if(io){
          if(active){
            io.emit('activeProductAdded', populatedDress);
            io.emit('activeDressAdded', populatedDress);
          } else {
            io.emit('inactiveProductAdded', populatedDress);
            io.emit('inactiveDressAdded', populatedDress);
          }
        }
      }
      if(product.stockType === 'Boja-Količina'){
        await PurseColor.deleteMany({ _id: { $in: colorIdsForDeletion }});
        await Purse.findByIdAndDelete(product._id);
        if(io){
          if(product.active){
            io.emit('activeProductRemoved', product._id);
            io.emit('activePurseRemoved', product._id);
          } else {
            io.emit('inactiveProductRemoved', product._id);
            io.emit('inactivePurseRemoved', product._id);
          }
        }
        const insertedColors = await PurseColor.insertMany(colorsArray);
        const colorIds = insertedColors.map((color) => color._id);
        const newPurse = new Purse({
          name: name,
          active: active,
          category: category,
          stockType: stockType,
          price: price,
          colors: colorIds,
          image: image,
        });
        const result = await newPurse.save();
        const populatedPurse = await Purse.findById(result._id).populate('colors');
        if(io){
          if(active){
            io.emit('activeProductAdded', populatedPurse);
            io.emit('activePurseAdded', populatedPurse);
          } else {
            io.emit('inactiveProductAdded', populatedPurse);
            io.emit('inactivePurseAdded', populatedPurse);
          }
        }
      }

      return res.status(200).json({ message: 'Proizvod je uspešno ažuriran' });
    }
  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during product update:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja proizvoda', statusCode)); 
  }
}