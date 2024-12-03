function normalizeReservationDate(date){
  let normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0); 
  return normalizedDate;
}

module.exports = {
  normalizeReservationDate,
}