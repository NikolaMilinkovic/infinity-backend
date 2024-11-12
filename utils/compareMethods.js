
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function compareAndUpdate(oldValue, newValue) {
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    if (!deepEqual(oldValue, newValue)) {
      console.log('> New value:', newValue);
      return newValue;
    }
    console.log('> Value not changed:', oldValue);
    return oldValue;
  }
  if (oldValue !== newValue) {
    console.log('> New value:', newValue);
  return newValue;
  }
  console.log('> Value not changed:', oldValue);
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

module.exports = {
  compareAndUpdate,
  compareValues
}