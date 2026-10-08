const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const PurchaseInvoice = require('./src/modules/purchases/purchaseInvoice.schema').PurchaseInvoice;
  console.log(PurchaseInvoice.collection.name);
  process.exit(0);
});
