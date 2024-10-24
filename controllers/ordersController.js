const CustomError = require("../utils/CustomError");
const { getSocketInstance } = require("../utils/socket");
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");
const { parseOrderData } = require("../utils/ai/AiMethods");
const { uploadMediaToS3 } = require("../utils/s3/s3Methods");
const Order = require('../schemas/order');
const { dressColorStockHandler, updateDressActiveStatus } = require("../utils/dressStockMethods");
const { purseColorStockHandler, updatePurseActiveStatus } = require("../utils/PurseStockMethods");

exports.addOrder = async(req, res, next) => {
  try{
    const buyerData = JSON.parse(req.body.buyerData);
    const productData = JSON.parse(req.body.productData);
    const productsPrice = parseFloat(req.body.productsPrice);
    const totalPrice = parseFloat(req.body.totalPrice);

    // Parse values back to bool
    const reservation = req.body.reservation === 'true';
    const packed = req.body.packed === 'true';
    const processed = req.body.processed === 'true';
    const courier = JSON.parse(req.body.courier);

    if (
      !buyerData                       || // Check if buyerData exists
      !productData                     || // Check if productData exists (use ! instead of length check)
      !Array.isArray(productData)      || // Ensure productData is an array
      productData.length === 0         || // Check if productData is empty
      !productsPrice                   || // Check if productsPrice exists
      !totalPrice                      || // Check if totalPrice exists
      typeof reservation !== 'boolean' || // Check if reservation is a boolean
      typeof packed !== 'boolean'      || // Check if packed is a boolean
      typeof processed !== 'boolean'   || // Check if processed is a boolean
      !courier                         || // Check if courier exists
      !req.file                           // Check if a file was uploaded
    ) {
      return next(new CustomError('Nepotpuni podaci za dodavanje nove porudžbine', 404));
    }
    
    // Extract profile image
    let profileImage;
    if (req.file) {
      profileImage = await uploadMediaToS3(req.file, next);
    }


    // betterConsoleLog('> Logging profile image', profileImage);
    // console.log('Profile Image:');
    betterConsoleLog('> Profile image: ', profileImage);
    // // Log the extracted variables
    // console.log('Buyer Data:', buyerData);
    productData.forEach(product => {
      betterConsoleLog('> Product data:', product);
    });
    // console.log('Products Price:', productsPrice);
    // console.log('Total Price:', totalPrice);
    // console.log('Reservation:', reservation);
    // console.log('Packed:', packed);
    // console.log('Processed:', processed);
    // console.log('Courier:', courier);
    // console.log('Profile Image:', profileImage);

    // NEW ORDER
    const order = new Order({
      buyer: {
        name: buyerData.name,
        address: buyerData.address,
        phone: buyerData.phone,
        profileImage: {
          uri: profileImage.uri,
          imageName: profileImage.imageName,
        },
      },
      products: productData,
      productsPrice: productsPrice,
      totalPrice: totalPrice,
      reservation: reservation,
      packed: packed,
      processed: processed,
      courier: {
        name: courier.name,
        deliveryPrice: courier.deliveryPrice
      }
    });

    const newOrder = await order.save();
    betterConsoleLog('> Logging New Order: ', newOrder);
    
    // SOCKETS | Handles updates in the database & on client
    const io = getSocketInstance();
    for(const product of productData){
      if(product.itemReference.stockType === 'Boja-Veličina-Količina'){
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
          stockType: product.itemReference.stockType,
          dressId: product.itemReference._id,
          colorId: product.selectedColorId,
          sizeId: product.selectedSizeId,
          decrement: 1
        }
        io.emit('allProductStockDecrease', dressData);


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
          stockType: product.itemReference.stockType,
          purseId: product.itemReference._id,
          colorId: product.selectedColorId,
          decrement: 1
        }
        io.emit('allProductStockDecrease', purseData);
      }
    }


    res.status(200).json({ message: 'Porudžbina uspešno dodata' });
  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding an order:', error);
    return next(new CustomError('Došlo je do problema prilikom dodavanja porudžbine', statusCode));   
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