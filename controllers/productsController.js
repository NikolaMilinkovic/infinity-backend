// Mock data for demonstration
let products = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
];

// GET products handler
exports.getProducts = (req, res) => {
  res.status(200).json(products);
};

exports.addProduct = (req, res) => {
  res.status(200).json({ message: 'Product added' })
}