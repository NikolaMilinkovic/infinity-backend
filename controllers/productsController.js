// Mock data for demonstration
let products = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
];

// GET products handler
exports.getProductsHandler = (req, res) => {
  res.status(200).json(products);
};

// PUT (update) product handler
exports.updateProduct = (req, res) => {
  const { id, name } = req.body;
  const product = products.find(p => p.id === id);

  if (product) {
    product.name = name;
    res.status(200).json({ message: 'Product updated', product });
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
};

// DELETE product handler
exports.removeProduct = (req, res) => {
  const { id } = req.body;
  const productIndex = products.findIndex(p => p.id === id);

  if (productIndex !== -1) {
    products.splice(productIndex, 1);
    res.status(200).json({ message: 'Product deleted' });
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
};
