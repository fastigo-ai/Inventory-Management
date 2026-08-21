const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const dis = await mongoose.connection.collection('dis')
    .find({ 'lineItems.quantity': 170 })
    .toArray();
    
  console.log("=== DIs WITH 170 QTY ===");
  dis.forEach(di => {
    console.log(`DI Ref: ${di.diNumber}, Top Circle: ${di.circle}`);
    di.lineItems.forEach(item => {
      if (item.quantity === 170) {
        console.log(`  - Item: ${item.itemName} (TempCode: ${item.tempCode}), Circle: ${item.circle}, Qty: ${item.quantity}`);
      }
    });
  });
  
  process.exit(0);
}
run().catch(console.error);
