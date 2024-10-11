const CustomError = require("../../utils/CustomError");
const Dress = require("../../schemas/dress");
const { getSocketInstance } = require('../../utils/socket');
const DressColor = require("../../schemas/dressColor");

// GET ACTIVE DRESSES
exports.getAllActiveDresses = async(req, res, next) => {
  try{
    const dresses = await Dress.find({ active: true }).populate('colors');
    res.status(200).json(dresses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o haljinama', statusCode));  
  }
};

// ADD NEW DRESS
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
    
    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for new active dress: ', newDress.name);
      io.emit('activeDressAdded', newDress);
    }

    res.status(200).json({ message: `Haljina sa imenom ${name} uspešno dodata` });
  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Doslo je do problema prilikom dodavanja proizvoda', statusCode));
  }
}

// GET INACTIVE DRESSES
exports.getAllInactiveDresses = async(req, res, next) => {
  try{
    const dresses = await Dress.find({ active: false }).populate('colors');
    res.status(200).json(dresses);

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Došlo je do problema prilikom preuzimanja informacija o haljinama', statusCode));    
  }
};

// DELETE A DRESS
exports.deleteDress = async(req, res, next) => {
  try{
    const { id } = req.params;
    const dress = await Dress.findById(id);
    if(!dress){
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404));
    }
    for (const colorId of dress.colors) {
      await DressColor.findByIdAndDelete(colorId);
    }
    const deletedDress = await Dress.findByIdAndDelete(id);
    if(!deletedDress){
      return next(new CustomError(`Haljina sa ID: ${id} nije pronađena`, 404));
    }

    // SOCKET HANDLING
    const io = getSocketInstance();
    if (io) {
      if (dress.active) {
        console.log('> Deleting an active dress');
        console.log('> Emiting an update to all devices for active dress deletion: ', deletedDress.name);
        io.emit('activeDressRemoved', deletedDress._id);
      } else {
        console.log('> Deleting an inactive dress');
        console.log('> Emiting an update to all devices for inactive dress deletion: ', deletedDress.name);
        io.emit('inactiveDressRemoved', deletedDress._id);
      }
    }


    res.status(200).json({ message: `Proizvod pod imenom ${deletedDress.name} je uspešno obrisan`, dress: deletedDress });

  } catch(error){
    const statusCode = error.statusCode || 500;
    console.error(error)
    return next(new CustomError('Došlo je do problema prilikom preuzimanja brisanja haljine', statusCode)); 
  }
}