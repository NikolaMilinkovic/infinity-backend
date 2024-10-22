const CustomError = require("../utils/CustomError");
const { getSocketInstance } = require("../utils/socket");
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");
const { parseOrderData } = require("../utils/ai/AiMethods");
const { uploadMediaToS3 } = require("../utils/s3/s3Methods");

exports.addOrder = async(req, res, next) => {
  try{
    const buyerData = JSON.parse(req.body.buyerData);
    const productData = JSON.parse(req.body.productData);
    const productsPrice = parseFloat(req.body.productsPrice);
    const totalPrice = parseFloat(req.body.totalPrice);
    const reservation = req.body.reservation === 'false';
    const packed = req.body.packed === 'false';
    const processed = req.body.processed === 'false';
    const courier = JSON.parse(req.body.courier);

    if(!buyerData || productData.length === 0 || !productsPrice || !totalPrice || !reservation || !packed || !processed || !courier || !req.file){
      return next(new CustomError('Nepotpuni podaci za dodavanje nove porudžbine', 404));
    }
    
    // Extract profile image
    if (req.file) {
      profileImage = await uploadMediaToS3(req.file, next);
    }
    console.log('Profile Image:');
    console.log(profileImage);
    // Log the extracted variables
    console.log('Buyer Data:', buyerData);
    console.log('Product Data:', productData[0].itemReference.colors);
    console.log('Products Price:', productsPrice);
    console.log('Total Price:', totalPrice);
    console.log('Reservation:', reservation);
    console.log('Packed:', packed);
    console.log('Processed:', processed);
    console.log('Courier:', courier);
    console.log('Profile Image:', profileImage);

    res.status(404).json({ message: 'kekw' })
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