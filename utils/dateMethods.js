function normalizeReservationDate(date) {
  let normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  return normalizedDate;
}

/**
 * Returns startOfDay and endOfDay for given timezone
 * Default timezone - Europe/Belgrade
 * @param {string} timezone text representation of timezone | default 'Europe/Belgrade'
 * @param {number} buffer time buffer in minutes | default 0
 */
function getDayStartEndTimeForTimezone(timezone = 'Europe/Belgrade', buffer = 0) {
  const now = new Date();
  const belgradeTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const [month, day, year] = belgradeTime.split('/').map(Number);

  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  startOfDay.setMinutes(startOfDay.getMinutes() - buffer);

  // End of day is start of next day
  const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  endOfDay.setMinutes(endOfDay.getMinutes() + buffer);

  return { startOfDay, endOfDay };
}

module.exports = {
  normalizeReservationDate,
  getDayStartEndTimeForTimezone,
};
