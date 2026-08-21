const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const sample = await mongoose.connection.collection('storeinwardentries').findOne({ inwardId: { $regex: /^INW-AUTO/ } });
  if (sample) {
    console.log("purchaseInvoiceId type:", typeof sample.purchaseInvoiceId, sample.purchaseInvoiceId.constructor.name);
    console.log(sample);
  } else {
    console.log("No auto entries found.");
  }
  process.exit(0);
}
run().catch(console.error);
