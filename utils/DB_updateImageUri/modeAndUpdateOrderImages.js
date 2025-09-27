const Order = require('../../schemas/order');
const { CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../s3/S3Client');
const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;

const targetFolder = 'clients/infinity_boutique/images/profiles/';

async function moveImage(oldUri, imageName) {
  try {
    const oldKey = oldUri.split('.com/')[1];
    const newKey = `${targetFolder}${imageName}`;

    // Copy object
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket_name,
        CopySource: `${bucket_name}/${oldKey}`,
        Key: newKey,
        ACL: 'public-read',
      })
    );

    return `https://${bucket_name}.s3.eu-central-1.amazonaws.com/${newKey}`;
  } catch (error) {
    if (error.Code === 'NoSuchKey') {
      console.log(`⚠️ Image not found in S3: ${oldUri} - skipping`);
      return null; // Return null to indicate failure
    }
    throw error; // Re-throw other errors
  }
}

async function updateOrders() {
  const orders = await Order.find();
  let skippedCount = 0;

  for (const order of orders) {
    if (!order.buyer?.profileImage?.uri || !order.buyer?.profileImage?.imageName) {
      console.log(`> Skipping order ${order._id} - no buyer profile image`);
      continue;
    }

    const { uri, imageName } = order.buyer.profileImage;
    if (uri.includes(targetFolder)) continue;

    const newUri = await moveImage(uri, imageName);
    if (newUri) {
      order.buyer.profileImage.uri = newUri;
      await order.save();
      console.log(`> Updated order ${order._id} buyer image URI`);
    } else {
      skippedCount++;
      console.log(`> Skipped order ${order._id} - image file missing`);
    }
  }

  console.log(`> Skipped ${skippedCount} orders due to missing images`);
}

async function runMoveOrderImages() {
  await updateOrders();
  console.log('> All order buyer images moved and URIs updated!');
}

module.exports = runMoveOrderImages;
