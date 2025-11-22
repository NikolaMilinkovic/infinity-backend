function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function compareAndUpdate(oldValue, newValue) {
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    if (!deepEqual(oldValue, newValue)) {
      return newValue;
    }
    return oldValue;
  }
  if (oldValue !== newValue) {
    return newValue;
  }
  return oldValue;
}

/**
 *
 * @param {any} value1
 * @param {any} value2
 * @returns - True if they are the same | False if they are different
 */
function compareValues(value1, value2) {
  if (typeof value1 === 'object' && typeof value2 === 'object') {
    if (deepEqual(value1, value2)) {
      return true;
    }
    return false;
  }
  if (value1 === value2) {
    return true;
  }
  return false;
}

/**
 * Recursively updates fields in oldObj with values from newObj if they differ, skips missing fields.
 * @param {Object} oldObj - Original object to be updated
 * @param {Object} newObj - Object with new values
 * @returns {Object} - Updated object
 */
function deepCompareAndUpdate(oldObj, newObj) {
  // Only proceed if both are objects
  if (typeof oldObj !== 'object' || typeof newObj !== 'object' || oldObj === null || newObj === null) {
    return newObj !== undefined ? newObj : oldObj;
  }

  const updated = Array.isArray(oldObj) ? [...oldObj] : { ...oldObj };

  for (const key of Object.keys(newObj)) {
    if (oldObj.hasOwnProperty(key)) {
      // Recurse if both are objects
      if (
        typeof oldObj[key] === 'object' &&
        oldObj[key] !== null &&
        typeof newObj[key] === 'object' &&
        newObj[key] !== null
      ) {
        updated[key] = deepCompareAndUpdate(oldObj[key], newObj[key]);
      } else if (oldObj[key] !== newObj[key]) {
        updated[key] = newObj[key];
      }
    }
    // If key does not exist in oldObj, skip
  }

  return updated;
}

module.exports = {
  compareAndUpdate,
  compareValues,
  deepCompareAndUpdate,
};
