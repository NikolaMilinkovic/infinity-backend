const DressColor = require('../schemas/dressColor');
const mongoose = require('mongoose');

async function updateDressColors(existingColorIds, newColors) {
  // Get existing dress colors
  const existingColors = await DressColor.find({ _id: { $in: existingColorIds } });

  // Create a map of existing colors by color name
  const existingMap = new Map();
  existingColors.forEach((color) => {
    existingMap.set(color.color, color);
  });

  const newColorNames = new Set(newColors.map((c) => c.color));
  const updatePromises = [];
  const newColorIds = [];

  // Process each new color
  for (const newColor of newColors) {
    const existing = existingMap.get(newColor.color);

    if (existing) {
      // 3. Update existing color
      existing.colorCode = newColor.colorCode;
      existing.sizes = newColor.sizes;
      updatePromises.push(existing.save());
      newColorIds.push(existing._id.toString());
      // Remove from map so we know it was processed
      existingMap.delete(newColor.color);
    } else {
      // 2. Add new color
      const newColorDoc = new DressColor(newColor);
      const savePromise = newColorDoc.save().then((savedColor) => {
        newColorIds.push(savedColor._id.toString());
        return savedColor;
      });
      updatePromises.push(savePromise);
    }
  }

  // 1. Remove colors that are no longer needed
  const obsoleteColors = Array.from(existingMap.values());
  const deletePromises = obsoleteColors.map((color) => DressColor.findByIdAndDelete(color._id));

  // Execute all operations
  await Promise.all([...updatePromises, ...deletePromises]);

  return newColorIds;
}

module.exports = updateDressColors;
