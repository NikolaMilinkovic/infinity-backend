const CustomError = require("../../utils/CustomError");
const Dress = require("../../schemas/dress");
const { getSocketInstance } = require('../../utils/socket');
const DressColor = require("../../schemas/dressColor");
const color = require("../../schemas/color");

// GET products handler
exports.getAllActiveDresses = async(req, res, next) => {
  try{
    const dresses = await Dress.find({ active: true }).populate('colors');
    res.status(200).json(dresses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Doslo je do problema prilikom dodavanja proizvoda', statusCode));    
  }
};

exports.addDress = async(req, res, next) => {
  try{
    const { name, category, price, colors } = req.body;
    if(!name || !category || !price || colors.length === 0) 
      return next(new CustomError('Vrednost za ime, kategoriju cenu ili boju nije pronađena', 404));

    colors.forEach(color => {
      delete color._id;
    });

    const insertedColors = await DressColor.insertMany(colors);
    const colorIds = insertedColors.map((color) => color._id);

    const newDress = new Dress({
      name,
      category,
      price,
      colors: colorIds
    })
    const result = await newDress.save();
    res.status(200).json({ message: `Haljina sa imenom ${name} uspešno dodata` });

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Doslo je do problema prilikom dodavanja proizvoda', statusCode));
  }
}