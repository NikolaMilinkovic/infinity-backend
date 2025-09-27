const CustomError = require('../utils/CustomError');
const { betterErrorLog, betterConsoleLog } = require('../utils/logMethods');
const { parseOrderData } = require('../utils/ai/AiMethods');
const { uploadMediaToS3, deleteMediaFromS3, uploadFileToS3 } = require('../utils/s3/S3DefaultMethods');
const Orders = require('../schemas/order');
const ProcessedOrders = require('../schemas/processedOrdersForPeriod');
const { dressColorStockHandler, dressBatchColorStockHandler } = require('../utils/dressStockMethods');
const { purseColorStockHandler, purseBatchColorStockHandler } = require('../utils/purseStockMethods');
const { removeOrderById, removeBatchOrdersById } = require('../utils/ordersMethods');
const { compareAndUpdate } = require('../utils/compareMethods');
const mongoose = require('mongoose');
const ProcessedOrdersForPeriod = require('../schemas/processedOrdersForPeriod');
const { normalizeReservationDate } = require('../utils/dateMethods');
const { updateLastUpdatedField } = require('../utils/helperMethods');
const Dress = require('../schemas/dress');
const Purse = require('../schemas/purse');
const { writeToLog } = require('../utils/s3/S3Methods');

exports.addOrder = async (req, res, next) => {
  try {
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
    const weight = req.body?.weight || 1;
    const value = req.body?.value || '';
    const internalRemark = req.body?.internalRemark || '';
    const deliveryRemark = req.body?.deliveryRemark || '';
    const orderNotes = req.body?.orderNotes || '';
    const reservationDate = normalizeReservationDate(req.body?.reservationDate) || '';

    if (
      !buyerData || // Check if buyerData exists
      !productData || // Check if productData exists (use ! instead of length check)
      !Array.isArray(productData) || // Ensure productData is an array
      productData.length === 0 || // Check if productData is empty
      !productsPrice || // Check if productsPrice exists
      typeof reservation !== 'boolean' || // Check if reservation is a boolean
      typeof packedIndicator !== 'boolean' || // Check if reservation is a boolean
      typeof packed !== 'boolean' || // Check if packed is a boolean
      typeof processed !== 'boolean' || // Check if processed is a boolean
      !courier || // Check if courier exists
      !req.file // Check if a file was uploaded
    ) {
      return next(new CustomError('Nepotpuni podaci za dodavanje nove porudžbine', 404, req));
    }

    // Extract profile image
    let profileImage;
    if (req.file) {
      profileImage = await uploadMediaToS3(req.file, 'clients/infinity_boutique/images/profiles', next);
    }

    productData.forEach((product) => {
      product.itemReference = product.itemReference._id;
    });

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
        deliveryPrice: courier.deliveryPrice,
      },
      weight: weight,
      value: value,
      internalRemark: internalRemark,
      deliveryRemark: deliveryRemark,
      orderNotes: orderNotes,
      reservationDate: reservationDate,
    });
    if (reservation) {
      order.reservationDate = reservationDate;
    } else {
      order.reservationDate = new Date();
    }

    const newOrder = await order.save();
    const io = req.app.locals.io;
    io.emit('orderAdded', newOrder);
    await updateLastUpdatedField('orderLastUpdatedAt', io);
    let dressUpdateData = [];
    let purseUpdateData = [];

    // SOCKETS | Handles updates in the database & on client
    for (const product of productData) {
      try {
        if (product.stockType === 'Boja-Veličina-Količina') {
          // Update the dress stock in DB
          const updatedItem = await dressColorStockHandler(
            product.selectedColorId,
            product.selectedSizeId,
            'decrement',
            1,
            next
          );
          const dress = await Dress.findById(product.itemReference);
          dress.totalStock -= 1;
          await dress.save();
          if (!updatedItem) return;

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
            decrement: 1,
          };
          dressUpdateData.push(dressData);
        } else {
          // Update the purse stock in DB
          const updatedItem = await purseColorStockHandler(product.selectedColorId, 'decrement', 1, next);
          const purse = await Purse.findById(product.itemReference);
          purse.totalStock -= 1;
          await purse.save();
          if (!updatedItem) return;

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
            decrement: 1,
          };
          purseUpdateData.push(purseData);
        }
      } catch (error) {
        console.error(error);
      }
    }
    if (dressUpdateData.length > 0) {
      io.emit('handleDressStockDecrease', dressUpdateData);
      io.emit('allProductStockDecrease', dressUpdateData);
    }
    if (purseUpdateData.length > 0) {
      io.emit('handlePurseStockDecrease', purseUpdateData);
      io.emit('allProductStockDecrease', purseUpdateData);
    }

    await writeToLog(
      req,
      `Added a new order [${newOrder._id}] for buyer [${newOrder.buyer.name}] with total price of [${newOrder.totalPrice}].`
    );
    return res.status(200).json({ message: 'Porudžbina uspešno dodata' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode, req, req.body));
  }
};

exports.getProcessedOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find({ processed: true }).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Procesovane porudžbine uspešno preuzete', orders });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching processed orders:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja porudžbina', statusCode, req));
  }
};

exports.getUnprocessedOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find({ processed: false }).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Neprocesovane porudžbine uspešno preuzete', orders });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching unprocessed orders:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja porudžbina', statusCode, req));
  }
};

exports.getUnpackedOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find({ packed: false, packedIndicator: false }).sort({ createdAt: -1 });
    res.status(200).json({ message: 'Nespakovane porudžbine uspešno preuzete', orders });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching unpacked orders:', error);
    return next(new CustomError('Došlo je do problema prilikom preuzimanja nespakovanih porudžbina', statusCode, req));
  }
};

exports.parseOrder = async (req, res, next) => {
  try {
    const { orderData } = req.body;
    if (!orderData) {
      return next(new CustomError(`Došlo je do problema prilikom parsiranja podataka o kupcu.`, 400, req));
    }

    const response = await JSON.parse(await parseOrderData(orderData));
    res.status(200).json({ message: `Podaci su uspešno parsirani`, data: response });

    await writeToLog(req, `[ORDERS] Parsed buyer data. data: \n ${orderData}`);
  } catch (error) {
    betterErrorLog('> Error parsing order data via AI:', error);
    return next(
      new CustomError('There was an error while parsing order data via AI', 500, req, { orderData: req.body.orderData })
    );
  }
};

// DELETE BATCH ORDERS
exports.removeOrdersBatch = async (req, res, next) => {
  try {
    // Array of order ids
    const orderIds = req.body;
    const io = req.app.locals.io;

    let response;
    if (orderIds.length === 1) response = await removeOrderById(orderIds[0], req);
    if (orderIds.length > 1) response = await removeBatchOrdersById(orderIds, req);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    // Generic field update to trigger fetch of updated data
    await updateLastUpdatedField('dressLastUpdatedAt', io);
    res.status(200).json({ message: 'Sve izabrane porudžbine su uspešno obrisane' });

    await writeToLog(req, `[ORDERS] Removed a batch of orders (${orderIds.length}): \n ${orderIds}`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error during batch order delete:', error);
    return next(
      new CustomError('Došlo je do problema prilikom brisanja porudžbina', statusCode, req, {
        orderIds: req.body.orderIds,
      })
    );
  }
};

exports.getOrdersByDate = async (req, res, next) => {
  try {
    const dateParam = req.params.date;
    const selectedDate = new Date(dateParam);

    if (isNaN(selectedDate.getTime())) {
      return next(new CustomError('Nevažeći format datuma', 400, req));
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const orders = await Orders.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      reservation: false,
    });
    const formattedDate = selectedDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    await writeToLog(req, `[ORDERS] Fetched orders for date [${selectedDate}]`);
    return res.status(200).json({ message: `Porudžbine uspešno pronađene za datum ${formattedDate}`, orders: orders });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog(`> Error while fetching order for date ${formattedDate}`, error);
    return next(
      new CustomError(`Došlo je do problema prilikom preuzimanja porudžbina za datum ${formattedDate}`, statusCode, req)
    );
  }
};

exports.getOrdersForPeriodFromDate = async (req, res, next) => {
  try {
    console.log('> getOrdersForPeriodFromDate called');
    const dateParam = req.params.date;
    console.log(`> dateParam is ${dateParam}`);
    const selectedDate = new Date(dateParam);

    if (isNaN(selectedDate.getTime())) {
      return next(new CustomError('Nevažeći format datuma', 400, req));
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const currentDate = new Date();

    const orders = await Orders.find({
      createdAt: {
        $gte: startOfDay,
        $lte: currentDate,
      },
      reservation: false,
    });
    const formattedDate = selectedDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    betterConsoleLog('> Found orders: ', orders);

    await writeToLog(req, `[ORDERS] Fetched orders for period from [${selectedDate}]`);
    return res
      .status(200)
      .json({ message: `Porudžbine uspešno pronađene za period od ${formattedDate} pa do sada`, orders: orders });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const formattedDate = req.params.date
      ? new Date(req.params.date).toLocaleDateString('sr-RS', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'izabranog datuma';

    betterErrorLog(`> Error while fetching orders for period from ${formattedDate} until now`, error);
    return next(
      new CustomError(
        `Došlo je do problema prilikom preuzimanja porudžbina za period od ${formattedDate} do danas`,
        statusCode
      )
    );
  }
};

exports.getReservationsByDate = async (req, res, next) => {
  try {
    const dateParam = req.params.date;
    const selectedDate = new Date(dateParam);

    if (isNaN(selectedDate.getTime())) {
      return next(new CustomError('Nevažeći format datuma', 400, req));
    }

    const queryDate = new Date(selectedDate);
    queryDate.setUTCHours(0, 0, 0, 0);

    // const endOfDay = new Date(selectedDate);
    // endOfDay.setUTCHours(23, 59, 59, 999);
    const reservations = await Orders.find({
      reservationDate: queryDate,
      reservation: true,
    });
    const formattedDate = selectedDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    await writeToLog(req, `[ORDERS] Fetched rreservations for date [${queryDate}]`);
    return res
      .status(200)
      .json({ message: `Rezervacije uspešno pronađene za datum ${formattedDate}`, reservations: reservations });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog(`> Error while fetching reservations for date ${formattedDate}`, error);
    return next(
      new CustomError(
        `Došlo je do problema prilikom preuzimanja rezervacija za datum ${formattedDate}`,
        statusCode,
        req
      )
    );
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const {
      name, // string
      address, // string
      phone, // number
      phone2, // number
      bankNumber, // string
      place, // string
      orderNotes,
      deliveryNotes,
    } = req.body;

    const profileImage = req.file;
    const courier = req.file ? JSON.parse(req.body.courier) : req.body.courier;
    const products = req.file ? JSON.parse(req.body.products) : req.body.products;
    const isReservation = req.file ? (req.body.isReservation === 'true' ? true : false) : req.body.isReservation;
    const isPacked = req.file ? (req.body.isPacked === 'true' ? true : false) : req.body.isPacked;
    const productsPrice = req.file ? parseFloat(req.body.productsPrice) : req.body.productsPrice;
    const customPrice = req.file ? parseFloat(req.body.customPrice) : req.body.customPrice;

    const weight = req.body?.weight || 0.5;
    const value = req.body?.value || '';
    const internalRemark = req.body?.internalRemark || '';
    const deliveryRemark = req.body?.deliveryNotes || '';

    let reservationDate;
    if (req.body?.reservationDate !== undefined) {
      reservationDate = new Date(req.body?.reservationDate);
    } else {
      reservationDate = new Date();
    }
    const normalizedDate = normalizeReservationDate(reservationDate);
    const { removedProducts, addedProducts } = compareProductArrays(order.products, products);

    // Increment the stock for each removed product from the order
    const io = req.app.locals.io;
    if (removedProducts.length > 0) {
      let dresses = [];
      let purses = [];

      for (const item of order.products) {
        if (removedProducts.some((id) => id.toString() === item._id.toString())) {
          let data;
          // Get correct data object for stock increase
          item.stockType === 'Boja-Veličina-Količina'
            ? (data = getDressIncrementData(item))
            : (data = getPurseIncrementData(item));
          // Push each data object to correct array based on stock type
          item.stockType === 'Boja-Veličina-Količina' ? dresses.push(data) : purses.push(data);
        }
      }
      if (purses.length > 0) await purseBatchColorStockHandler(purses, 'increment', next);
      if (dresses.length > 0) await dressBatchColorStockHandler(dresses, 'increment', next);

      const data = {
        dresses: dresses,
        purses: purses,
      };
      io.emit('batchStockIncrease', data);
    }

    if (addedProducts.length > 0) {
      let dresses = [];
      let purses = [];

      for (const item of addedProducts) {
        let data;
        // Get correct data object for stock decrease
        item.stockType === 'Boja-Veličina-Količina'
          ? (data = getDressIncrementData(item))
          : (data = getPurseIncrementData(item));
        // Push each data object to correct array based on stock type
        item.stockType === 'Boja-Veličina-Količina' ? dresses.push(data) : purses.push(data);
      }
      if (purses.length > 0) await purseBatchColorStockHandler(purses, 'decrement', next);
      if (dresses.length > 0) await dressBatchColorStockHandler(dresses, 'decrement', next);
      const data = {
        dresses: dresses,
        purses: purses,
      };
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
    order.orderNotes = compareAndUpdate(order.orderNotes, orderNotes);
    order.reservationDate = compareAndUpdate(order.reservationDate, normalizedDate);
    order.buyer.place = compareAndUpdate(order.buyer.place, place);
    order.buyer.phone2 = compareAndUpdate(order.buyer.phone2, phone2);
    order.buyer.bankNumber = compareAndUpdate(order.buyer.bankNumber, bankNumber);
    order.value = compareAndUpdate(order.value, value);
    order.weight = compareAndUpdate(order.weight, weight);
    order.internalRemark = compareAndUpdate(order.internalRemark, internalRemark);
    order.deliveryRemark = compareAndUpdate(order.deliveryRemark, deliveryRemark);

    if (profileImage && profileImage.originalname !== order.buyer.profileImage.imageName) {
      await deleteMediaFromS3(order.buyer.profileImage.imageName, 'clients/infinity_boutique/images/profiles');
      const image = await uploadMediaToS3(profileImage, 'clients/infinity_boutique/images/profiles', next);
      order.buyer.profileImage = image;
    }

    const updatedOrder = await order.save();
    io.emit('orderUpdated', updatedOrder);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    res.status(200).json({ message: 'Porudžbina uspešno ažurirana' });
    await writeToLog(req, `[ORDERS] Updated an order [${order._id}] for buyer [${order.buyer.name}]`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating an order', error);
    return next(new CustomError('Došlo je do problema prilikom ažuriranja porudžbine', statusCode, req));
  }
};

function compareProductArrays(oldProducts, newProducts) {
  // Get _id strings for products with an _id in oldProducts
  const oldProductIds = oldProducts.filter((product) => product._id).map((product) => product._id.toString());

  // Get _id strings for products with an _id in newProducts
  const newProductIds = newProducts.filter((product) => product._id).map((product) => product._id.toString());

  // Find removed products by comparing old ids with new ids
  const removedProducts = oldProductIds.filter((id) => !newProductIds.includes(id));

  // Find added products by including products without _id and those with _id not in oldProductIds
  const addedProducts = [
    ...newProducts.filter((product) => !product._id), // Products without _id are new
    ...newProducts.filter((product) => product._id && !oldProductIds.includes(product._id.toString())), // Products with _id not in oldProducts
  ];

  return { removedProducts, addedProducts };
}
function getDressIncrementData(item) {
  return {
    dressId: item.itemReference.toString(),
    colorId: item.selectedColorId,
    sizeId: item.selectedSizeId,
    increment: 1,
  };
}
function getPurseIncrementData(item) {
  return {
    purseId: item.itemReference.toString(),
    colorId: item.selectedColorId,
    increment: 1,
  };
}

exports.setIndicatorToTrue = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Orders.findByIdAndUpdate(id, { packedIndicator: true });
    const io = req.app.locals.io;
    io.emit('setStockIndicatorToTrue', id);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    res.status(200).json({ message: 'Success' });
    await writeToLog(req, `[ORDERS] Set indicator for order [${id}] to TRUE.`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating package indicator to true', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode, req)
    );
  }
};

exports.setIndicatorToFalse = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Orders.findByIdAndUpdate(id, { packedIndicator: false });
    const io = req.app.locals.io;
    io.emit('setStockIndicatorToFalse', id);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    res.status(200).json({ message: 'Success' });
    await writeToLog(req, `[ORDERS] Set indicator for order [${id}] to FALSE.`);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error while updating package indicator to false', error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode, req)
    );
  }
};

exports.packOrdersByIds = async (req, res, next) => {
  try {
    const { packedIds } = req.body;
    const operations = packedIds.map((id) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(`${id}`) },
        update: { $set: { packed: true } },
      },
    }));
    await Orders.collection.bulkWrite(operations);
    const io = req.app.locals.io;
    io.emit('packOrdersByIds', packedIds);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    await writeToLog(req, `[ORDERS] Packed orders:\n${packedIds}`);
    return res.status(200).json({ message: 'Porudžbine uspešno spakovane' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog("> Error while packing orders by ID's", error);
    return next(
      new CustomError('Došlo je do problema prilikom ažuriranja stanja pakovanja porudžbine', statusCode, req)
    );
  }
};

// Note - createdAt se menja na serveru pa zatim zasebno na frontu, znaci da ce biti desync prilikom prebacivanja iz reservation to order
// Doneta odluka zato sto je ovo najlaksi i najbrzi nacin, na frontu samo setamo new Date() umesto da menjamo ceo order item ili radimo update
exports.batchReservationsToCourier = async (req, res, next) => {
  try {
    const { courier, reservations } = req.body;
    const operations = reservations.map((reservation) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(`${reservation._id}`) },
        update: [
          {
            $set: {
              reservation: false,
              courier: {
                name: courier.name,
                deliveryPrice: courier.deliveryPrice,
              },
              createdAt: new Date(),
            },
          },
          // Izbacili smo recalculate price iz razloga
          // Ukoliko postavimo nas custom price, npr. 0, onda ce da je pregazi sto je jako lose!!
          // {
          //   $set: {
          //     totalPrice: {
          //       $add: ['$productsPrice', courier.deliveryPrice],
          //     },
          //   },
          // },
        ],
      },
    }));

    const io = req.app.locals.io;
    const data = {
      courier,
      reservations,
    };
    io.emit('reservationsToOrders', data);
    await updateLastUpdatedField('orderLastUpdatedAt', io);

    const result = await Orders.bulkWrite(operations);
    res.status(200).json({ message: 'Rezervacije uspešno prebačene u porudžbine' });

    await writeToLog(
      req,
      `[ORDERS] Moved ${reservations.length} reservations to active orders for courier [${courier.name}].`
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog(`> Error while transfering batch reservations courier ${courier.name}`, error);
    return next(new CustomError('Došlo je do problema prilikom prebacivanja rezervacija', statusCode, req));
  }
};

exports.parseOrdersForLatestPeriod = async (req, res, next) => {
  try {
    const { fileName, fileData, courier } = req.body;
    let uploadedFile;
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      uploadedFile = await uploadFileToS3(
        { buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        '',
        next
      );
      // uri & fileName
    }
    // Get all orders that are active, not a reservation, and for specific courier
    const orders = await Orders.find({ processed: false, reservation: false, 'courier.name': courier });
    betterConsoleLog('> Logging orders', orders);
    const totalSalesValue = getTotalSalesValue(orders);
    const averageOrderValue = getAverageOrderValue(totalSalesValue, orders.length);
    const salesPerStockType = getSalesPerStockType(orders);
    const performer = getTopAndWorstPerformingProducts(orders);
    const numOfOrdersByCategory = getNumberOfOrdersByCategory(orders);
    const perColorSold = getPerColorSold(orders);
    const perLocationSales = getPerLocationSales(orders);
    const perProductStats = getPerProductStats(orders);

    const newProcessedOrder = new ProcessedOrdersForPeriod({
      fileName: fileName,
      excellLink: uploadedFile.uri,
      courierName: courier,
      numOfOrders: orders.length,
      totalSalesValue: totalSalesValue,
      averageOrderValue: averageOrderValue,
      salesPerStockType: salesPerStockType,
      topSellingProducts: performer.top,
      leastSellingProducts: performer.worst,
      numOfOrdersByCategory: numOfOrdersByCategory,
      perColorSold: perColorSold,
      perLocationSales: perLocationSales,
      perProductStats: perProductStats,
    });
    await newProcessedOrder.save();

    // Update each order processed field to true
    const orderIds = orders.map((order) => order._id);
    await Orders.updateMany({ _id: { $in: orderIds } }, { $set: { processed: true } });

    const io = req.app.locals.io;
    io.emit('processOrdersByIds', orderIds);
    io.emit('getProcessedOrdersStatistics', newProcessedOrder);
    io.emit('addNewStatisticFile', newProcessedOrder);
    await updateLastUpdatedField('orderLastUpdatedAt', io);
    await writeToLog(req, `[ORDERS] Parsed | Processed orders | Finished the day for courier [${courier.name}].`);
    return res.status(200).json({ message: 'Porudžbine uspešno procesovane' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error parsing orders during excell file generation', error);
    return next(
      new CustomError('Došlo je do problema prilikom parsiranja porudžbina i generisanja exell-a', statusCode, req)
    );
  }
};

function getTotalSalesValue(orders) {
  let totalSalesValue = 0;
  for (const order of orders) {
    totalSalesValue += order.totalPrice;
  }
  return totalSalesValue;
}
function getAverageOrderValue(totalSalesValue, numOfOrders) {
  return Math.round(totalSalesValue / numOfOrders);
}
function getTopAndWorstPerformingProducts(orders) {
  let productSales = {};

  for (const order of orders) {
    for (const product of order.products) {
      if (productSales[product.itemReference]) {
        productSales[product.itemReference].amountSold += 1;
      } else {
        productSales[product.itemReference] = {
          name: product.name,
          amountSold: 1,
        };
      }
    }
  }

  const top = Object.entries(productSales)
    .sort(([, a], [, b]) => b.amountSold - a.amountSold)
    .slice(0, 3)
    .map(([id, { name, amountSold }]) => ({
      id,
      name,
      amountSold,
    }));

  const worst = Object.entries(productSales)
    .sort(([, a], [, b]) => a.amountSold - b.amountSold)
    .slice(0, 3)
    .map(([id, { name, amountSold }]) => ({
      id,
      name,
      amountSold,
    }));

  return { top, worst };
}
function getNumberOfOrdersByCategory(orders) {
  let ordersPerCategory = {};

  for (const order of orders) {
    for (const product of order.products) {
      if (ordersPerCategory[product.category]) {
        ordersPerCategory[product.category].totalValue += product.price;
        ordersPerCategory[product.category].amountSold += 1;
      } else {
        ordersPerCategory[product.category] = {
          category: product.category,
          totalValue: product.price,
          amountSold: 1,
        };
      }
    }
  }

  const sortedData = Object.values(ordersPerCategory).sort((a, b) => b.amountSold - a.amountSold);
  return sortedData;
}
function getPerColorSold(orders) {
  let perColor = {};

  for (const order of orders) {
    for (const product of order.products) {
      if (perColor[product.selectedColor]) {
        perColor[product.selectedColor].amountSold += 1;
      } else {
        perColor[product.selectedColor] = {
          color: product.selectedColor,
          amountSold: 1,
        };
      }
    }
  }

  const sortedData = Object.values(perColor).sort((a, b) => b.amountSold - a.amountSold);
  return sortedData;
}
function getPerLocationSales(orders) {
  let perLocation = {};

  for (const order of orders) {
    if (perLocation[order.buyer.place]) {
      perLocation[order.buyer.place].amountSold += 1;
      perLocation[order.buyer.place].totalValue += order.totalPrice;
    } else {
      perLocation[order.buyer.place] = {
        location: order.buyer.place,
        amountSold: 1,
        totalValue: order.totalPrice,
      };
    }
  }
  const sortedData = Object.values(perLocation).sort((a, b) => b.amountSold - a.amountSold);
  return sortedData;
}
function getPerProductStats(orders) {
  let perProduct = {};

  for (const order of orders) {
    for (const product of order.products) {
      if (perProduct[product.itemReference]) {
        perProduct[product.itemReference].productTotalSalesValue += product.price;
        perProduct[product.itemReference].amountSold += 1;
        // handle selected size update
        if (product.selectedSize) {
          const sizeSold = perProduct[product.itemReference].perSizeSold.find(
            (sizeRecord) => sizeRecord.size === product.selectedSize
          );
          if (sizeSold) {
            sizeSold.amountSold += 1;
          } else {
            perProduct[product.itemReference].perSizeSold.push({
              size: product.selectedSize,
              amountSold: 1,
            });
          }
        }
        // handle selected color update
        if (product.selectedColor) {
          const colorSold = perProduct[product.itemReference].perColorSold.find(
            (colorRecord) => colorRecord.color === product.selectedColor
          );
          if (colorSold) {
            colorSold.amountSold += 1;
          } else {
            perProduct[product.itemReference].perColorSold.push({
              color: product.selectedColor,
              amountSold: 1,
            });
          }
        }
      } else {
        perProduct[product.itemReference] = {
          productReference: product.itemReference,
          productName: product.name,
          productCategory: product.category,
          productPrice: product.price,
          productTotalSalesValue: product.price,
          amountSold: 1,
          productImage: product.image,
          perSizeSold: product.selectedSize ? [{ size: product.selectedSize, amountSold: 1 }] : [],
          perColorSold: product.selectedColor ? [{ color: product.selectedColor, amountSold: 1 }] : [],
        };
      }
    }
  }

  const sortedData = Object.values(perProduct).sort((a, b) => b.amountSold - a.amountSold);
  return sortedData;
}
function getSalesPerStockType(orders) {
  let perStockType = {};
  let checkedOrders = orders;
  for (const order of checkedOrders) {
    for (const product of order.products) {
      if (!product.stockType) {
        if (product.selectedSize) {
          product.stockType = 'Boja-Veličina-Količina';
        } else {
          product.stockType = 'Boja-Veličina';
        }
      }
    }
  }

  for (const order of checkedOrders) {
    for (const product of order.products) {
      if (product.stockType) {
        if (perStockType[product.stockType]) {
          perStockType[product.stockType].amountSold += 1;
          perStockType[product.stockType].totalValue += product.price;
        } else {
          perStockType[product.stockType] = {
            stockType: product.stockType,
            amountSold: 1,
            totalValue: product.price,
          };
        }
      }
    }
  }

  const sortedData = Object.values(perStockType).sort((a, b) => b.amountSold - a.amountSold);
  return sortedData;
}

exports.getOrderStatisticFilesForPeriod = async (req, res, next) => {
  try {
    const today = new Date();
    const startOf30DaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const files = await ProcessedOrders.find({
      createdAt: { $gte: startOf30DaysAgo, $lte: endOfToday },
    }).sort({ createdAt: -1 });

    res.status(200).json({ message: 'Podaci uspešno preuzeti', data: files });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error fetching processed orders for period:', error);
    return next(
      new CustomError('Došlo je do problema prilikom preuzimanja procesovanih porudžbina / statistike', statusCode, req)
    );
  }
};
