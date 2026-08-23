require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const diSchema = new mongoose.Schema({}, { strict: false });
  const DI = mongoose.models.DI || mongoose.model('DI', diSchema);
  
  const dis = await DI.find({ diNumber: { $regex: /21058/i } }).lean();
  const di = dis[0];
  console.log("Checking 2086 line item...");
  
  for (const li of di.lineItems) {
      if (li.loaSerialNo == '2086') {
          console.log(`Found serial 2086!`);
          console.log(`li.circle =`, li.circle);
          console.log(`di.circle =`, di.circle);
          console.log(`Full lineItem object:`, li);
      }
  }
  
  process.exit(0);
});
