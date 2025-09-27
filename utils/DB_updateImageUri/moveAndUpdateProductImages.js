const Dress = require('../../schemas/dress'); // adjust path
const Purse = require('../../schemas/purse'); // adjust path
const { CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../s3/S3Client');
const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;

const targetFolder = 'clients/infinity_boutique/images/products/';

async function moveImage(oldUri, imageName) {
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
}

async function updateProducts(ProductModel) {
  const products = await ProductModel.find();

  for (const product of products) {
    const { uri, imageName } = product.image;
    if (uri.includes(targetFolder)) continue;
    const newUri = await moveImage(uri, imageName, s3);
    product.image.uri = newUri;
    await product.save();
    console.log(`> Updated product ${product._id} with new URI`);
  }
}

async function runMoveImages() {
  await updateProducts(Dress);
  await updateProducts(Purse);
  console.log('> All images moved and URIs updated!');
}

module.exports = runMoveImages;
