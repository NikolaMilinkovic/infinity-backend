const CustomError = require("../../utils/CustomError");
const Dress = require("../../schemas/dress");
const DressColor = require("../../schemas/dressColor");
const Purse = require("../../schemas/purse")
const PurseColor = require("../../schemas/purseColor")
const { uploadMediaToS3, deleteMediaFromS3 } = require("../../utils/s3/S3DefaultMethods");
const { betterErrorLog, betterConsoleLog } = require("../../utils/logMethods");
const { removePurseById } = require("../../utils/purseStockMethods");
const { removeDressById } = require("../../utils/dressStockMethods");
const { compareAndUpdate } = require('../../utils/compareMethods');
const { ProductDisplayCounter } = require('../../schemas/productDisplayCounter');

exports.removeProductBatch = async (req, res, next) => {
  try{
    const data = req.body;
  
    for(const item of data){
      console.log('> Deleting for item', item._id, item.stockType);
      if(item.stockType === 'Boja-Veličina-Količina'){
        await removeDressById(item._id, req);
      }
      if(item.stockType === 'Boja-Količina'){
        await removePurseById(item._id, req);
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
    const {
      previousStockType,
      active,
      name,
      price,
      category,
      stockType,
      colors,
      description,
      supplier,
    } = req.body;
    const { id } = req.params;
    const io = req.app.locals.io;

    
    let product;
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    // betterConsoleLog('> Logging out received colors', colorsArray[0].sizes);
    // return res.status(200);
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
        image = product.image;
      } else {
        image = await uploadMediaToS3(req.file, next);
        await deleteMediaFromS3(product.image.imageName);
      }
    } else {
      // If no new image is provided, keep the existing image
      image = product.image;
    }
    if(!product) return res.status(404).json({ message: 'Prizvod nije pronađen u bazi podataka za id: '+ id });

    // COMPARE PRODUCT STOCK TYPE
    if(stockType !== previousStockType){
      const colorIdsForUpdate = product.colors;
      // DIFFERENT STOCK TYPE
      // Remove all product color objects & remove the product | Socket update clients
      if(product.stockType === 'Boja-Veličina-Količina'){
        await DressColor.deleteMany({ _id: { $in: colorIdsForUpdate }});
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
          description: description,
          supplier: supplier,
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
        await PurseColor.deleteMany({ _id: { $in: colorIdsForUpdate }});
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
          description: description,
          supplier: supplier,
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

      // Same stock type, just update the fields and create new DressColor objects
      if(product.stockType === 'Boja-Veličina-Količina'){
        const colorIdsForUpdate = product.colors;
        await DressColor.deleteMany({ _id: { $in: colorIdsForUpdate }});
        const insertedColors = await DressColor.insertMany(colorsArray);
        const colorIds = insertedColors.map((color) => color._id);

        product.name = compareAndUpdate(product.name, name);
        product.image = compareAndUpdate(product.image, image);
        product.active = compareAndUpdate(product.active, active);
        product.price = compareAndUpdate(product.price, price);
        product.category = compareAndUpdate(product.category, category);
        product.stockType = compareAndUpdate(product.stockType, stockType);
        product.description = compareAndUpdate(product.description, description);
        product.supplier = compareAndUpdate(product?.supplier, supplier);
        product.colors = colorIds;
        const updatedProduct = await product.save();
        const fetchedUpdatedProduct = await Dress.findById({ _id: updatedProduct._id }).populate('colors');
        
        if(io){
          if(product.active){
            io.emit('activeProductUpdated', fetchedUpdatedProduct);
          } else {
            io.emit('inactiveProductUpdated', fetchedUpdatedProduct);
          }
        }
      }

      if(product.stockType === 'Boja-Količina'){
        const colorIdsForUpdate = product.colors;
        await PurseColor.deleteMany({ _id: { $in: colorIdsForUpdate }});
        const insertedColors = await PurseColor.insertMany(colorsArray);
        betterConsoleLog('> insertedColors', insertedColors);
        const colorIds = insertedColors.map((color) => color._id);

        product.name = compareAndUpdate(product.name, name);
        product.image = compareAndUpdate(product.image, image);
        product.active = compareAndUpdate(product.active, active);
        product.price = compareAndUpdate(product.price, price);
        product.category = compareAndUpdate(product.category, category);
        product.stockType = compareAndUpdate(product.stockType, stockType);
        product.description = compareAndUpdate(product.description, description);
        product.supplier = compareAndUpdate(product?.supplier, supplier);
        product.colors = colorIds;

        const updatedProduct = await product.save();
        const fetchedUpdatedProduct = await Purse.findById({ _id: updatedProduct._id }).populate('colors');
        betterConsoleLog('> fetchedUpdatedProduct', fetchedUpdatedProduct);

        if(io){
          if(product.active){
            io.emit('activeProductUpdated', fetchedUpdatedProduct);
          } else {
            io.emit('inactiveProductUpdated', fetchedUpdatedProduct);
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

exports.updateDisplayPriority = async (req, res, next) => {
  try{
    const { position, dresses, purses } = req.body;
    if(!['top', 'mid', 'bot'].includes(position))
      throw new Error(`Position must be either [top, mid, bot], it is currently ${position}`);
    const displayPriority = await getDisplayPriority(position);

    // Update each item in DB
    if(purses.length > 0){
      await updateDisplayPriorities(purses, 'Boja-Količina', displayPriority);
    }
    if(dresses.length > 0){
      await updateDisplayPriorities(dresses, 'Boja-Veličina-Količina', displayPriority);
    }

    const io = req.app.locals.io;
    const products = [...dresses, ...purses];
    const displayPriorityUpdates = {
      displayPriority: displayPriority,
      products: products,
    }
    if(io){
      io.emit('updateProductDisplayPriority', displayPriorityUpdates);
    }

    return res.status(200).json({ message: 'Pozicije uspešno ažurirane' });
  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during display priority update:', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja pozicije proizvoda', statusCode)); 
  }
}

async function updateDisplayPriorities(items, stockType, displayPriority){
  try{
    const model = stockType === 'Boja-Količina' ? Purse : Dress;

    const result = await model.updateMany(
      { _id: { $in: items } },
      { $set: { displayPriority } }
    );

    betterConsoleLog('> Batch update result:', result);
  } catch (error) {
    betterErrorLog('> Error while updating the priorities in the updateDisplayPriorities method:', error);
    throw new Error('Došlo je do problema prilikom ažuriranja pozicije proizvoda');
  }
}
async function getDisplayPriority(position){
  const displayCounter = await ProductDisplayCounter.findOne();
  if (!displayCounter) throw new Error("DisplayCounter not found.");
  betterConsoleLog('> Logging display counter', displayCounter);
  let priority;

  if(position === 'top'){
    displayCounter.high += 1;
    priority = displayCounter.high;
  }
  if(position === 'mid'){
    const mid = Math.round((displayCounter.high + displayCounter.low) / 2);
    priority = mid;
  }
  if(position === 'bot'){
    displayCounter.low -= 1;
    priority = displayCounter.low;
  }
  await displayCounter.save();
  return priority;
}