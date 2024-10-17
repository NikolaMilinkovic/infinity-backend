const CustomError = require("../utils/CustomError");
const { getSocketInstance } = require("../utils/socket");
const { betterErrorLog, betterConsoleLog } = require("../utils/logMethods");
const { parseOrderData } = require("../utils/ai/AiMethods");

exports.parseOrder = async(req, res, next) => {
  try{
    console.log('> Attempting to extract order data')
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