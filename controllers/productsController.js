const CustomError = require("../utils/CustomError");




// GET products handler
exports.getProducts = (req, res, next) => {
  console.log('> Get products called')
  res.status(200).json(products);
};

exports.addProduct = (req, res, next) => {
  try{
    const { name, category, price, colors } = req.body;
    if(!name || !category || !price) return next(new CustomError('Vrednost za ime, kategoriju ili cenu nije pronađena', 404));

    

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Doslo je do problema prilikom dodavanja proizvoda', statusCode));
  }
  res.status(200).json({ message: 'Product added' })
}