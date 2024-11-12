const CustomError = require("../utils/CustomError");
const { getSocketInstance } = require("../utils/socket");
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");
const { parseOrderData } = require("../utils/ai/AiMethods");
const { uploadMediaToS3, deleteMediaFromS3 } = require("../utils/s3/s3Methods");
const Orders = require('../schemas/order');
const { dressColorStockHandler, dressBatchColorStockHandler } = require("../utils/dressStockMethods");
const { purseColorStockHandler, purseBatchColorStockHandler } = require("../utils/PurseStockMethods");
const { removeOrderById, removeBatchOrdersById } = require("../utils/ordersMethods");
const { compareAndUpdate, compareValues } = require('../utils/compareMethods');
const mongoose = require('mongoose');
const { SelectObjectContentRequestFilterSensitiveLog } = require("@aws-sdk/client-s3");

exports.addOrder = async(req, res, next) => {
  try{

    // return res.status(200).json({ message: 'Temp response 200 to prevent going through whole addOrder api' })
    const buyerData = JSON.parse(req.body.buyerData);
    const productData = JSON.parse(req.body.productData);
    const productsPrice = parseFloat(req.body.productsPrice);
    const totalPrice = parseFloat(req.body.totalPrice);

    // Parse values back to bool
    const reservation = req.body.reservation === 'true';
    const packedIndicator = req.body.packed === 'true';
    const packed = req.body.packed === 'true';
    const processed = req.body.processed === 'true';
    const courier = JSON.parse(req.body.courier);

    const weight = req.body?.weight || 0.5;
    const value = req.body?.value || '';
    const internalRemark = req.body?.internalRemark || '';
    const deliveryRemark = req.body?.deliveryRemark || '';

    // buyer.place,
    // buyer.phone2,
    // buyer.bankNumber,
    // value,
    // weight,
    // internalRemark,
    // deliveryRemark,

    if (
      !buyerData                           || // Check if buyerData exists
      !productData                         || // Check if productData exists (use ! instead of length check)
      !Array.isArray(productData)          || // Ensure productData is an array
      productData.length === 0             || // Check if productData is empty
      !productsPrice                       || // Check if productsPrice exists
      !totalPrice                          || // Check if totalPrice exists
      typeof reservation !== 'boolean'     || // Check if reservation is a boolean
      typeof packedIndicator !== 'boolean' || // Check if reservation is a boolean
      typeof packed !== 'boolean'          || // Check if packed is a boolean
      typeof processed !== 'boolean'       || // Check if processed is a boolean
      !courier                             || // Check if courier exists
      !req.file                               // Check if a file was uploaded
    ) {
      return next(new CustomError('Nepotpuni podaci za dodavanje nove porudžbine', 404));
    }
    
    // Extract profile image
    let profileImage;
    if (req.file) {
      profileImage = await uploadMediaToS3(req.file, next);
    }

    productData.forEach(product => {
      betterConsoleLog('> Product data:', product);
    });
    productData.forEach((product) => {
      product.itemReference = product.itemReference._id;
    })

    // NEW ORDER
    const order = new Orders({
      buyer: {
        name: buyerData.name,
        address: buyerData.address,
        place: buyerData?.place || '',
        phone: buyerData.phone,
        phone2: buyerData?.phone2 || '',
        bankNumber: buyerData?.bankNumber || '',
        profileImage: {
          uri: profileImage.uri,
          imageName: profileImage.imageName,
        },
      },
      products: productData,
      productsPrice: productsPrice,
      totalPrice: totalPrice,
      reservation: reservation,
      packedIndicator: packed,
      packed: packed,
      processed: processed,
      courier: {
        name: courier.name,
        deliveryPrice: courier.deliveryPrice
      },
      weight: weight,
      value: value,
      internalRemark: internalRemark,
      deliveryRemark: deliveryRemark,
    });

    const newOrder = await order.save();
    const io = getSocketInstance();
    io.emit('orderAdded', newOrder);
    betterConsoleLog('> Logging New Order: ', newOrder);
    
    // SOCKETS | Handles updates in the database & on client
    for(const product of productData){
      if(product.stockType === 'Boja-Veličina-Količina'){
        // Update the dress stock in DB
        const updatedItem = await dressColorStockHandler(product.selectedColorId, product.selectedSizeId, 'decrement', 1, next)
        if(!updatedItem) return;

        // Check and update item status if needed
        // Commented out because we want to see when item is out of stock
        // If item is not active it will not be displayed in browse products
        // const checkedItem = await updateDressActiveStatus(product.itemReference._id);
        // if(!checkedItem) return;

        // Emit new dress stock
        const dressData = {
          stockType: product.stockType,
          dressId: product.itemReference,
          colorId: product.selectedColorId,
          sizeId: product.selectedSizeId,
          decrement: 1
        }
        io.emit('allProductStockDecrease', dressData);
        io.emit('handleDressStockDecrease', dressData);


        // Call socket active to unactive update for all devices
      } else {

        // Update the purse stock in DB
        const updatedItem = await purseColorStockHandler(product.selectedColorId, 'decrement', 1, next)
        if(!updatedItem) return;

        // Check and update item status if needed
        // Commented out because we want to see when item is out of stock
        // If item is not active it will not be displayed in browse products
        // const checkedItem = await updatePurseActiveStatus(product.itemReference._id);
        // if(!checkedItem) return;

        // Emit new purse stock
        const purseData = {
          stockType: product.stockType,
          purseId: product.itemReference,
          colorId: product.selectedColorId,
          decrement: 1
        }
        io.emit('allProductStockDecrease', purseData);
        io.emit('handlePurseStockDecrease', purseData);
      }
    }


    res.status(200).json({ message: 'Porudžbina uspešno dodata' });
  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode));   
  }
}

exports.getProcessedOrders = async(req, res, next) => {
  try{
    const orders = await Orders.find({ processed: true }).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Procesovane porudžbine uspešno preuzete', orders });

  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching processed orders:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja porudžbina', statusCode));  
  }
}

exports.getUnprocessedOrders = async(req, res, next) => {
  try{
    const orders = await Orders.find({ processed: false });
    res.status(200).json({ message: 'Neprocesovane porudžbine uspešno preuzete', orders });

  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching unprocessed orders:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja porudžbina', statusCode));  
  }
}

exports.parseOrder = async(req, res, next) => {
  try{
    const { orderData } = req.body;
    if(!orderData){
      return next(new CustomError(`Došlo je do problema prilikom parsiranja podataka o kupcu.`, 400));
    }

    const response = await JSON.parse(await parseOrderData(orderData));
    
    res.status(200).json({ message: `Podaci su uspešno parsirani`, data: response });

  } catch(error){
    betterErrorLog('> Error parsing order data via AI:', error);
    return next(new CustomError('There was an error while parsing order data via AI', 500));
  }
}

// DELETE BATCH ORDERS
exports.removeOrdersBatch = async (req, res, next) => {
  try{
    // Array of order ids
    const orderIds = req.body;

    betterConsoleLog('> Logging out data', orderIds);
    let response;
    if(orderIds.length === 1) response = await removeOrderById(orderIds[0]);
    if(orderIds.length > 1) response = await removeBatchOrdersById(orderIds);
    
    // betterConsoleLog('> Logging order removal response', response);
    res.status(200).json({ message: 'Sve izabrane porudžbine su uspešno obrisane' });

  } catch(error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during batch order delete:', error);
    return next(new CustomError('Došlo je do problema prilikom brisanja porudžbina', statusCode)); 
  }
}

exports.getOrdersByDate = async (req, res, next) => {
  try{
    const dateParam = req.params.date;
    const selectedDate = new Date(dateParam);
  
    if (isNaN(selectedDate.getTime())) {
      return next(new CustomError('Nevažeći format datuma', 400));
    }
  
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
  
    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const orders = await Orders.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      reservation: false
    });
    const formattedDate = selectedDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return res.status(200).json({ message: `Porudžbine uspešno pronađene za datum ${formattedDate}`, orders: orders })
  } catch(error) {
    const statusCode = error.statusCode || 500;
    return next(new CustomError(`Došlo je do problema prilikom preuzimanja porudžbina za datum ${formattedDate}`, statusCode)); 
  }
}

exports.getReservationsByDate = async (req, res, next) => {
  try{
    const dateParam = req.params.date;
    const selectedDate = new Date(dateParam);
  
    if (isNaN(selectedDate.getTime())) {
      return next(new CustomError('Nevažeći format datuma', 400));
    }
  
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
  
    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const reservations = await Orders.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      reservation: true
    });
    const formattedDate = selectedDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return res.status(200).json({ message: `Rezervacije uspešno pronađene za datum ${formattedDate}`, reservations: reservations })
  } catch(error) {
    const statusCode = error.statusCode || 500;
    return next(new CustomError(`Došlo je do problema prilikom preuzimanja rezervacija za datum ${formattedDate}`, statusCode)); 
  }
}


exports.updateOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { 
      name,           // string 
      address,        // string
      phone,          // number
      phone2,         // number
      bankNumber,     // string
      place,          // string
    } = req.body;

    const profileImage = req.file;
    const courier = req.file ? JSON.parse(req.body.courier) : req.body.courier;
    const products = req.file ? JSON.parse(req.body.products) : req.body.products;
    betterConsoleLog('> Logging out received products', products);
    const isReservation = req.file ? (req.body.isReservation === 'true' ? true : false) : req.body.isReservation;
    const isPacked = req.file ? (req.body.isPacked === 'true' ? true : false) : req.body.isPacked;
    const productsPrice = req.file ? parseFloat(req.body.productsPrice) : req.body.productsPrice;
    const customPrice = req.file ? parseFloat(req.body.customPrice) : req.body.customPrice;

    const weight = req.body?.weight || 0.5;
    const value = req.body?.value || '';
    const internalRemark = req.body?.internalRemark || '';
    const deliveryRemark = req.body?.deliveryRemark || '';

    // buyer.place,
    // buyer.phone2,
    // buyer.bankNumber,
    // value,
    // weight,
    // internalRemark,
    // deliveryRemark,
    const { removedProducts, addedProducts } = compareProductArrays(order.products, products);

    // betterConsoleLog('> removedProducts: ', removedProducts);
    // betterConsoleLog('> addedProducts: ', addedProducts);
    // Increment the stock for each removed product from the order
    const io = getSocketInstance();
    if(removedProducts.length > 0){
      let dresses = [];
      let purses = [];

      for(const item of order.products){
        if(removedProducts.some((id) => id.toString() === item._id.toString())){
          let data;
          // Get correct data object for stock increase
          item.stockType === 'Boja-Veličina-Količina' ? 
            data = getDressIncrementData(item) :
            data = getPurseIncrementData(item);
          // Push each data object to correct array based on stock type
          item.stockType === 'Boja-Veličina-Količina' ? 
            dresses.push(data) :
            purses.push(data);
        }
      }
      if(purses.length > 0) await purseBatchColorStockHandler(purses, 'increment', next);
      if(dresses.length > 0) await dressBatchColorStockHandler(dresses, 'increment', next);

      const data = {
        dresses: dresses,
        purses: purses
      }
      betterConsoleLog('> Logging data', data);
      io.emit('batchStockIncrease', data);
    }

    if(addedProducts.length > 0){
      let dresses = [];
      let purses = [];

      for(const item of addedProducts){
        let data;
        // Get correct data object for stock decrease
        item.stockType === 'Boja-Veličina-Količina' ? 
          data = getDressIncrementData(item) :
          data = getPurseIncrementData(item);
        // Push each data object to correct array based on stock type
        item.stockType === 'Boja-Veličina-Količina' ? 
          dresses.push(data) :
          purses.push(data);
      }
      if(purses.length > 0) await purseBatchColorStockHandler(purses, 'decrement', next);
      if(dresses.length > 0) await dressBatchColorStockHandler(dresses, 'decrement', next);
      const data = {
        dresses: dresses,
        purses: purses
      }
      betterConsoleLog('> Added Products data for decrementing values on front is: ', data);
      io.emit('batchStockDecrease', data);
    }

    order.buyer.name = compareAndUpdate(order.buyer.name, name);
    order.buyer.address = compareAndUpdate(order.buyer.address, address);
    order.buyer.phone = compareAndUpdate(order.buyer.phone, phone);
    order.courier = compareAndUpdate(order.courier, courier);
    order.products = compareAndUpdate(order.products, products);
    order.reservation = compareAndUpdate(order.reservation, isReservation);
    order.packed = compareAndUpdate(order.packed, isPacked);
    order.productsPrice = compareAndUpdate(order.productsPrice, productsPrice);
    order.totalPrice = compareAndUpdate(order.totalPrice, customPrice);
    // buyer.place,
    // buyer.phone2,
    // buyer.bankNumber,
    // value,
    // weight,
    // internalRemark,
    // deliveryRemark,
    order.buyer.place = compareAndUpdate(order.buyer.place, place);
    order.buyer.phone2 = compareAndUpdate(order.buyer.phone2, phone2);
    order.buyer.bankNumber = compareAndUpdate(order.buyer.bankNumber, bankNumber);
    order.value = compareAndUpdate(order.value, value);
    order.weight = compareAndUpdate(order.weight, weight);
    order.internalRemark = compareAndUpdate(order.internalRemark, internalRemark);
    order.deliveryRemark = compareAndUpdate(order.deliveryRemark, deliveryRemark);
    
    if (profileImage && profileImage.originalname !== order.buyer.profileImage.imageName) {
      await deleteMediaFromS3(order.buyer.profileImage.imageName);
      const image = await uploadMediaToS3(profileImage, next);
      order.buyer.profileImage = image;
    }

    const updatedOrder = await order.save();
    console.log('Order Updated Socket called')
    betterConsoleLog('> UPDATED ORDER IS', updatedOrder);
    io.emit('orderUpdated', updatedOrder);

    res.status(200).json({ message: 'Porudžbina uspešno ažurirana' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja porudžbine', statusCode));
  }
};

function compareProductArrays(oldProducts, newProducts) {
  // Get _id strings for products with an _id in oldProducts
  const oldProductIds = oldProducts
    .filter(product => product._id)
    .map(product => product._id.toString());

  // Get _id strings for products with an _id in newProducts
  const newProductIds = newProducts
    .filter(product => product._id)
    .map(product => product._id.toString());

  // Find removed products by comparing old ids with new ids
  const removedProducts = oldProductIds.filter(id => !newProductIds.includes(id));
  betterConsoleLog('> Removed Products are', removedProducts);

  // Find added products by including products without _id and those with _id not in oldProductIds
  const addedProducts = [
    ...newProducts.filter(product => !product._id),  // Products without _id are new
    ...newProducts.filter(product => product._id && !oldProductIds.includes(product._id.toString()))  // Products with _id not in oldProducts
  ];

  betterConsoleLog('> Added products are', addedProducts);

  return { removedProducts, addedProducts };
}
function getDressIncrementData(item){
  return {
    dressId: item.itemReference.toString(),
    colorId: item.selectedColorId,
    sizeId: item.selectedSizeId,
    increment: 1,
  }
}
function getPurseIncrementData(item){
  return {
    purseId: item.itemReference.toString(),
    colorId: item.selectedColorId,
    increment: 1,
  }
}

exports.setIndicatorToTrue = async (req, res, next) => {
  try{
    const { id } = req.params;
    await Orders.findByIdAndUpdate(id, { packedIndicator: true });
    const io = getSocketInstance();
    io.emit('setStockIndicatorToTrue', id);

    res.status(200).json({ message: 'Success' });
  } catch(error) {
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode));
  }
}

exports.setIndicatorToFalse = async (req, res, next) => {
  try{
    const { id } = req.params;
    await Orders.findByIdAndUpdate(id, { packedIndicator: false });
    const io = getSocketInstance();
    io.emit('setStockIndicatorToFalse', id);

    res.status(200).json({ message: 'Success' });
  } catch(error) {
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode));
  }
}

exports.packOrdersByIds = async (req, res, next) => {
  try{
    const { packedIds } = req.body;
    betterConsoleLog('> Logging packed ids', packedIds);
    const operations = packedIds.map((id) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(`${id}`) },
        update: { $set: { packed: true } }
      }
    }))
    await Orders.collection.bulkWrite(operations);
    const io = getSocketInstance();
    io.emit('packOrdersByIds', packedIds);

    return res.status(200).json({ message: 'Porudžbine uspešno spakovane' });
  } catch(error) {
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode));
  }
}

exports.batchReservationsToCourier = async (req, res, next) => {
  try{
    const { courier, reservations } = req.body;
    betterConsoleLog('> Loggign courier', courier);
    betterConsoleLog('> Loggign reservations', reservations);
    const operations = reservations.map((reservation) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(`${reservation._id}`) },
        update: [
          { 
            $set: { 
              reservation: false,
              courier: {
                name: courier.name,
                deliveryPrice: courier.deliveryPrice
              },
            }
          },
          {
            $set: { 
              totalPrice: { 
                $add: [ '$productsPrice', courier.deliveryPrice ]
              }
            }
          }
        ]
      }
    }));

    const io = getSocketInstance();
    const data = {
      courier,
      reservations,
    }
    io.emit('reservationsToOrders', data);

    const result = await Orders.bulkWrite(operations);
    res.status(200).json({ mesasge: 'Rezervacije uspešno prebačene u porudžbine' })

  } catch(error) {
    const statusCode = error.statusCode || 500;
    console.error(error);
    return next(new CustomError('Došlo je do problema prilikom prebacivanja rezervacija', statusCode));
  }
}