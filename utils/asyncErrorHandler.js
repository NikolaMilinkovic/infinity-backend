// Used for wrapping async methods in order to handle errors
// 
// Example.
// exports.registrujUcenika = asyncErrorHandler(async(req, res) =>{
// })
// 
// Meaning we dont need to do the try / catch block in the method as
// asyncErrorHandler is wrapping it and handling the error.

module.exports = (func) => {
  return () => {
    func(req, res, next).catch(err => next(err));
  }
}