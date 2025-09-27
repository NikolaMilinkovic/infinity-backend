const Order = require('../../schemas/order');
const bucket_name = process.env.BUCKET_NAME;

const targetFolder = 'clients/infinity_boutique/images/img_backup/';

async function updateOrderProductImages() {
  try {
    console.log('Starting order product image URI update...');

    // Get all orders
    const orders = await Order.find();
    console.log(`Found ${orders.length} orders to process`);

    let updatedOrdersCount = 0;
    let updatedProductsCount = 0;

    for (const order of orders) {
      let orderNeedsUpdate = false;

      // Loop through all products in this order
      for (const product of order.products) {
        // Check if product has image and URI
        if (product.image && product.image.uri && product.image.imageName) {
          const currentUri = product.image.uri;

          // Skip if already pointing to img_backup
          if (currentUri.includes(targetFolder)) {
            continue;
          }

          // Skip if already pointing to products folder (newly created products)
          if (currentUri.includes('clients/infinity_boutique/images/products/')) {
            continue;
          }

          // Update URI to point to img_backup folder
          const newUri = `https://${bucket_name}.s3.eu-central-1.amazonaws.com/${targetFolder}${product.image.imageName}`;

          product.image.uri = newUri;
          orderNeedsUpdate = true;
          updatedProductsCount++;

          console.log(`  > Updated product "${product.name}" image URI in order ${order._id}`);
        }
      }

      // Save the order if any product was updated
      if (orderNeedsUpdate) {
        await order.save();
        updatedOrdersCount++;
        console.log(`> Saved order ${order._id} with updated product images`);
      }
    }

    console.log('='.repeat(50));
    console.log(`Migration completed!`);
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`Orders updated: ${updatedOrdersCount}`);
    console.log(`Product images updated: ${updatedProductsCount}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = updateOrderProductImages;
