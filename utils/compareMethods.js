
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

module.exports = {
  compareAndUpdate,
}