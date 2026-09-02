const mongoose = require('mongoose');
const { ClientBill } = require('./dist/modules/client-billing/clientBill.schema.js');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const bills = await ClientBill.find({});
  console.log('Total bills:', bills.length);
  if (bills.length > 0) {
    console.log(bills[0]);
  }
  process.exit(0);
}).catch(console.error);
