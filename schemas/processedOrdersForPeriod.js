const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProcessedOrdersForPeriodSchema = new Schema({
  fileName: { type: String, required: [true, 'Filename is required'] },
  excellLink: { type: String, required: [true, 'Excell link is required'] },
  courierName: { type: String, required: [true, 'Courier is required'] },
  numOfOrders: { type: Number, required: [true, 'Num of orders is required'] },
  totalSalesValue: { type: Number, required: [true, 'Total sales value is required'] },
  averageOrderValue: { type: Number, required: [true, 'Average order value is required'] },
  salesPerStockType: [
    {
      stockType: { type: String, required: [true, 'StockType is required'] },
      amountSold: { type: Number, required: [true, 'salesPerStockType.amountSold is required'] },
      totalValue: { type: Number, required: [true, 'salesPerStockType.totalValue is required'] },
    }
  ],
  topSellingProducts: [
    {
      id: { type: Schema.Types.ObjectId, ref: 'Product' },
      amountSold: { type: Number, required: [false] },
    }
  ],
  leastSellingProducts: [
    {
      id: { type: Schema.Types.ObjectId, ref: 'Product' },
      amountSold: { type: Number, required: [false] },
    }
  ],
  numOfOrdersByCategory: [
    {
      category: { type: String, required: [false] },
      amountSold: { type: Number, required: [false] },
      totalValue: { type: Number, required: [false] },
    }
  ],
  perColorSold: [
    {
      color: { type: String, required: [false] },
      amountSold: { type: Number, required: [false] },
    }
  ],

  perProductStats: [
    {
      productReference: { type: Schema.Types.ObjectId, required: [true, 'Product Reference is required'] },
      productName: { type: String, required: [true, 'Product name is required'] },
      productCategory: { type: String, required: [true, 'Product  category is required'] },
      productPrice: { type: Number, required: [true, 'Product price is required'] },
      productTotalSalesValue: { type: Number, required: [true, 'productTotalSalesValue is required'] },
      amountSold: { type: Number, required: [false] },
      productImage: {
        uri: { type: String, required: [true, 'Image is required'] },
        imageName: { type: String, require: [true, 'Image Name is required'] },
      },
      perSizeSold: [
        {
          size: { type: String, required: [false] },
          amountSold: { type: Number, required: [false] },
        }
      ],
      perColorSold: [
        {
          color: { type: String, required: [false] },
          amountSold: { type: Number, required: [false] },
        }
      ],
    }
  ],
  perLocationSales: [
    {
      location: { type: String, required: [false] },
      amountSold: { type: Number, required: [false] },
      totalValue: { type: Number, required: [false] },
    }
  ]
}, { timestamps: true }); 

module.exports = mongoose.model("ProcessedOrdersForPeriod", ProcessedOrdersForPeriodSchema);