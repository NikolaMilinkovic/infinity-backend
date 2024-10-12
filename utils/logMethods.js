function betterConsoleLog(message, log){
  console.log(message, JSON.stringify(log, null, 2));
}
function betterErrorLog(message, log){
  console.error(message, JSON.stringify(log, null, 2));
}


module.exports = { betterConsoleLog, betterErrorLog };