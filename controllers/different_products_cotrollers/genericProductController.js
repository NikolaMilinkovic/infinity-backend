const CustomError = require('../../utils/CustomError');
const Dress = require('../../schemas/dress');
const Boutique = require('../../schemas/boutiqueSchema');
const DressColor = require('../../schemas/dressColor');
const Purse = require('../../schemas/purse');
const PurseColor = require('../../schemas/purseColor');
const { uploadMediaToS3 } = require('../../utils/s3/S3DefaultMethods');
const { betterErrorLog, betterConsoleLog } = require('../../utils/logMethods');
const { removePurseById } = require('../../utils/purseStockMethods');
const { removeDressById } = require('../../utils/dressStockMethods');
const { compareAndUpdate } = require('../../utils/compareMethods');
const ProductDisplayCounter = require('../../schemas/productDisplayCounter');
const { updateLastUpdatedField, getBoutiqueId } = require('../../utils/helperMethods');
const updateDressColors = require('../../utils/updateDressColors');
const updatePurseColors = require('../../utils/updatePurseColors');
const { writeToLog } = require('../../utils/s3/S3Methods');

// REMOVE PRODUCT BATCH
exports.removeProductBatch = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const data = req.body;
    const io = req.app.locals.io;

    for (const item of data) {
      if (item.stockType === 'Boja-Veličina-Količina') {
        await updateLastUpdatedField('dressLastUpdatedAt', io, boutiqueId);
        await removeDressById(item._id, boutiqueId, req, next);
      }
      if (item.stockType === 'Boja-Količina') {
        await updateLastUpdatedField('purseLastUpdatedAt', io, boutiqueId);
        await removePurseById(item._id, boutiqueId, req, next);
      }
    }

    res.status(200).json({ message: 'Svi izabrani artikli su uspešno obrisani' });
    await writeToLog(req, `[PRODUCTS] Deleted (${data.length}) products via removeProductsBatch method.`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while deleting a product:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja proizvoda', statusCode, req, { data: req.body })
    );
  }
};

// UPDATE PRODUCT
/**
 * Azuriramo sve informacije osim stockType, ovo je odluka kako bi smo pojednostavili logiku i sprecili bagove
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { active, name, price, category, stockType, colors, description, supplier } = req.body;
    const { id } = req.params;
    const io = req.app.locals.io;

    let product;
    let oldProduct;
    let colorsArray = Array.isArray(colors) ? colors : JSON.parse(colors);
    const newImageData = req.file;
    let image;

    if (stockType === 'Boja-Veličina-Količina') {
      product = await Dress.findOne({ _id: id, boutiqueId }).populate('colors');
    }
    if (stockType === 'Boja-Količina') {
      product = await Purse.findOne({ _id: id, boutiqueId }).populate('colors');
    }
    if (newImageData) {
      // If an image is uploaded, handle it
      if (newImageData.imageName === product.image.imageName) {
        image = product.image;
      } else {
        const boutique_data = await Boutique.findById(boutiqueId);
        image = await uploadMediaToS3(req.file, `clients/${boutique_data.boutiqueName}/images/products`);
      }
    } else {
      // If no new image is provided, keep the existing image
      image = product.image;
    }
    if (!product) return res.status(404).json({ message: 'Prizvod nije pronađen u bazi podataka za id: ' + id });

    // DRESSES -> BOJA-VELICINA-KOLICINA
    if (product.stockType === 'Boja-Veličina-Količina') {
      if (product.stockType !== stockType) {
        return next(new CustomError('Izmena tipa jedinice proizvoda nije dozvoljena!', 403, req, { data: req.body }));
      }
      const colorIdsForUpdate = product.colors;
      const newColorIds = await updateDressColors(colorIdsForUpdate, colorsArray);

      product.name = compareAndUpdate(product.name, name);
      product.image = compareAndUpdate(product.image, image);
      product.active = compareAndUpdate(product.active, active);
      product.price = compareAndUpdate(product.price, price);
      product.category = compareAndUpdate(product.category, category);
      product.description = compareAndUpdate(product.description, description);
      product.supplier = compareAndUpdate(product?.supplier, supplier);
      product.colors = newColorIds;

      let totalStock = 0;
      for (const color of newColorIds) {
        const colorDoc = await DressColor.findById(color);
        totalStock += colorDoc.sizes.reduce((sum, sz) => sum + sz.stock, 0);
      }

      product.totalStock = totalStock;
      product.colors = newColorIds;
      const updatedProduct = await product.save();
      const fetchedUpdatedProduct = await Dress.findOne({ _id: updatedProduct._id, boutiqueId: boutiqueId }).populate(
        'colors'
      );

      if (io) {
        if (product.active) {
          await updateLastUpdatedField('dressLastUpdatedAt', io, boutiqueId);
          io.to(`boutique-${boutiqueId}`).emit('activeProductUpdated', fetchedUpdatedProduct);
        } else {
          await updateLastUpdatedField('dressLastUpdatedAt', io, boutiqueId);
          io.to(`boutique-${boutiqueId}`).emit('inactiveProductUpdated', fetchedUpdatedProduct);
        }
      }
      await writeToLog(
        req,
        `[PRODUCTS] Updated a product [${product._id}] [${product.name}].\n\n[OLD] ${JSON.stringify(
          oldProduct,
          null,
          2
        )}\n\n[UPDATED] ${JSON.stringify(fetchedUpdatedProduct, null, 2)}`
      );
    }

    // PURSES -> BOJA-KOLICINA
    if (product.stockType === 'Boja-Količina') {
      if (product.stockType !== stockType) {
        return next(new CustomError('Izmena tipa jedinice proizvoda nije dozvoljena!', 403, req, { data: req.body }));
      }
      const colorIdsForUpdate = product.colors;
      const newColorIds = await updatePurseColors(colorIdsForUpdate, colorsArray);

      product.name = compareAndUpdate(product.name, name);
      product.image = compareAndUpdate(product.image, image);
      product.active = compareAndUpdate(product.active, active);
      product.price = compareAndUpdate(product.price, price);
      product.category = compareAndUpdate(product.category, category);
      product.description = compareAndUpdate(product.description, description);
      product.supplier = compareAndUpdate(product?.supplier, supplier);
      product.colors = newColorIds;

      let totalStock = 0;
      for (const color of newColorIds) {
        const colorDoc = await PurseColor.findById(color);
        totalStock += colorDoc.stock;
      }

      product.totalStock = totalStock;
      product.colors = newColorIds;
      const updatedProduct = await product.save();
      const fetchedUpdatedProduct = await Purse.findOne({ _id: updatedProduct._id, boutiqueId: boutiqueId }).populate(
        'colors'
      );

      if (io) {
        if (product.active) {
          await updateLastUpdatedField('purseLastUpdatedAt', io, boutiqueId);
          io.to(`boutique-${boutiqueId}`).emit('activeProductUpdated', fetchedUpdatedProduct);
        } else {
          await updateLastUpdatedField('purseLastUpdatedAt', io, boutiqueId);
          io.to(`boutique-${boutiqueId}`).emit('inactiveProductUpdated', fetchedUpdatedProduct);
        }
      }
      await writeToLog(
        req,
        `[PRODUCTS] Updated a product [${product._id}] [${product.name}].\n\n[OLD] ${JSON.stringify(
          oldProduct,
          null,
          2
        )}\n\n[UPDATED] ${JSON.stringify(fetchedUpdatedProduct, null, 2)}`
      );
    }

    return res.status(200).json({ message: 'Proizvod je uspešno ažuriran' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating a product:', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja proizvoda', statusCode, req, { data: req.body })
    );
  }
};

exports.updateDisplayPriority = async (req, res, next) => {
  try {
    const { position, dresses, purses } = req.body;
    const boutiqueId = getBoutiqueId(req);
    if (!['top', 'mid', 'bot'].includes(position))
      throw new Error(`Position must be either [top, mid, bot], it is currently ${position}`);
    const displayPriority = await getDisplayPriority(position, boutiqueId);

    // Update each item in DB
    if (purses.length > 0) {
      await updateDisplayPriorities(purses, 'Boja-Količina', displayPriority, boutiqueId);
    }
    if (dresses.length > 0) {
      await updateDisplayPriorities(dresses, 'Boja-Veličina-Količina', displayPriority, boutiqueId);
    }

    const io = req.app.locals.io;
    const products = [...dresses, ...purses];
    const displayPriorityUpdates = {
      displayPriority: displayPriority,
      products: products,
    };
    if (io) {
      // TO DO > IMPLEMENT FEATURE > Trenutno nemamo u samoj semi updateProductDisplayPriority :)
      io.to(`boutique-${boutiqueId}`).emit('updateProductDisplayPriority', displayPriorityUpdates);
    }

    res.status(200).json({ message: 'Pozicije uspešno ažurirane' });
    await writeToLog(
      req,
      `[PRODUCTS] Updated display priority to [${position}] for [${dresses.length + purses.length}].`
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating a product position:', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja pozicije proizvoda', statusCode, req, {
        position: req.body.position,
        dresses: req.body.dresses,
        purses: req.body.purses,
      })
    );
  }
};

async function updateDisplayPriorities(items, stockType, displayPriority, boutiqueId) {
  try {
    const model = stockType === 'Boja-Količina' ? Purse : Dress;

    const result = await model.updateMany({ _id: { $in: items }, boutiqueId }, { $set: { displayPriority } });

    return result;
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating display priorities:', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja pozicije proizvoda', statusCode, req, {
        items,
        stockType,
        displayPriority,
        boutiqueId,
      })
    );
  }
}

async function getDisplayPriority(position, boutiqueId) {
  const displayCounter = await ProductDisplayCounter.findOne({ boutiqueId });
  if (!displayCounter) throw new Error('DisplayCounter not found.');
  let priority;

  if (position === 'top') {
    displayCounter.high += 1;
    priority = displayCounter.high;
  }
  if (position === 'mid') {
    const mid = Math.round((displayCounter.high + displayCounter.low) / 2);
    priority = mid;
  }
  if (position === 'bot') {
    displayCounter.low -= 1;
    priority = displayCounter.low;
  }
  await displayCounter.save();
  return priority;
}
