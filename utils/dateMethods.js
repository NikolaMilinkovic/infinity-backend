function normalizeReservationDate(date) {
  let normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  return normalizedDate;
}

/**
 * Returns startOfDay and endOfDay for given timezone
 * Default timezone - Europe/Belgrade
 * @param {string} timezone
 */
function getDayStartEndTimeForTimezone(timezone = 'Europe/Belgrade') {
  const now = new Date();
  const belgradeTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const [month, day, year] = belgradeTime.split('/').map(Number);

  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

  return { startOfDay, endOfDay };
}

module.exports = {
  normalizeReservationDate,
  getDayStartEndTimeForTimezone,
};
