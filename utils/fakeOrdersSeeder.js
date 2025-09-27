const mongoose = require('mongoose');
const Order = require('../schemas/order');

async function createFakeOrders(count = 100) {
  console.log('> Running fake order seeder');
  const orders = [];

  const buyers = [
    { name: 'Nikola Milinkovic', address: 'Bulevar 12', place: 'Belgrade', phone: '0601234567' },
    { name: 'Ana Petrovic', address: 'Ulica 5', place: 'Novi Sad', phone: '0612345678' },
    { name: 'Marko Jovanovic', address: 'Trg 7', place: 'Niš', phone: '0623456789' },
  ];

  const productsList = [
    { name: 'Red Dress', category: 'Dress', price: 50 },
    { name: 'Blue Purse', category: 'Purse', price: 30 },
    { name: 'Green Dress', category: 'Dress', price: 60 },
  ];

  const couriers = [
    { name: 'DHL', deliveryPrice: 5 },
    { name: 'UPS', deliveryPrice: 7 },
    { name: 'FedEx', deliveryPrice: 6 },
  ];

  for (let i = 0; i < count; i++) {
    const buyer = buyers[i % buyers.length];
    const product = productsList[i % productsList.length];
    const courier = couriers[i % couriers.length];

    const order = {
      buyer: {
        name: buyer.name,
        address: buyer.address,
        place: buyer.place,
        phone: buyer.phone,
        profileImage: {
          uri: 'https://infinity-boutique.s3.eu-central-1.amazonaws.com/dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg',
          imageName: 'dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg',
        },
      },
      products: [
        {
          itemReference: new mongoose.Types.ObjectId(),
          name: product.name,
          category: product.category,
          price: product.price,
          stockType: 'new',
          image: {
            uri: 'https://infinity-boutique.s3.eu-central-1.amazonaws.com/dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg',
            imageName: 'dbdc5e7d7304c9f0f622cd16a9391a63608cd3c0e2032990423e4442290e27fc.jpeg',
          },
          mongoDB_type: product.category === 'Dress' ? 'Dress' : 'Purse',
          selectedColor: 'Red',
          selectedColorId: new mongoose.Types.ObjectId().toString(),
          selectedSize: 'M',
        },
      ],
      productsPrice: product.price,
      totalPrice: product.price + courier.deliveryPrice,
      courier: courier,
      weight: '1kg',
      reservation: false,
      createdAt: new Date(),
      reservationDate: new Date(),
    };

    orders.push(order);
  }

  await Order.insertMany(orders);
  console.log(`${count} orders added`);
}

module.exports = { createFakeOrders };
