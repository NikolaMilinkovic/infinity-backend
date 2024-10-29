// server.js or your main server file
const mongoose = require('mongoose');
const Purse = require('../schemas/purse'); // Import the Purse model
const PurseColor = require('../schemas/purseColor'); // Import the PurseColor model

async function seedPurses() {
  try {
    // Check if purses have already been seeded
    const existingPurses = await Purse.countDocuments();
    if (existingPurses >= 100) {
      console.log('Purses already seeded.');
      return;
    }

    const purses = [];
    const colors = await PurseColor.find({}).select('_id'); // Fetch all available colors

    for (let i = 0; i < 1000; i++) {
      const purse = new Purse({
        name: `Purse ${i + 1}`,
        active: true,
        category: 'Torbica',
        stockType: 'Boja-Količina', // Set your stockType here
        price: Math.floor(Math.random() * 100) + 20, // Random price between 20 and 120
        colors: colors.map(color => color._id), // Assign all available colors
        image: {
          uri: "https://infinity-boutique.s3.eu-central-1.amazonaws.com/dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg",
          imageName: "dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg",
        },
      });
      purses.push(purse);
    }

    // Bulk insert the purses into the database
    await Purse.insertMany(purses);
    console.log('100 purses seeded successfully');
  } catch (error) {
    console.error('Error seeding purses:', error);
  }
}

module.exports = {
  seedPurses
};

