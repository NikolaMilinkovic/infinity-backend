function betterConsoleLog(message, log){
  if(typeof log === 'string' && isJSON(log)){
    console.log(message, JSON.stringify(log, null, 2));
  } else {
    console.log(message, log);
  }
}
function betterErrorLog(message, log){
  if(typeof log === 'string' && isJSON(log)){
    console.error(message, JSON.stringify(log, null, 2));
    console.error(log);
  } else {
    console.error(message);
    console.error(log);
  }
}


module.exports = { betterConsoleLog, betterErrorLog };