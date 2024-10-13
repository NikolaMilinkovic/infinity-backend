const CustomError = require("../utils/CustomError");
const { betterErrorLog } = require("../utils/logMethods");




// GET products handler
exports.getProducts = (req, res, next) => {
  console.log('> Get products called')
  res.status(200).json(products);
};
// ADD new product
exports.addProduct = (req, res, next) => {
  try{
    const { name, category, price, colors } = req.body;
    if(!name || !category || !price) return next(new CustomError('Vrednost za ime, kategoriju ili cenu nije pronađena', 404));

    

  } catch(error){
    const statusCode = error.statusCode || 500;
    betterErrorLog('> Error adding a new product:', error);
    return next(new CustomError('Doslo je do problema prilikom dodavanja proizvoda', statusCode));
  }
  res.status(200).json({ message: 'Product added' })
}