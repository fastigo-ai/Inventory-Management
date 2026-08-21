const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const entries = await mongoose.connection.collection('storeinwardentries')
    .find({ $or: [{ invoiceQty: 170 }, { totalQty: 170 }, { challanQty: 170 }] })
    .toArray();
    
  console.log("=== INWARDS WITH QTY 170 ===");
  entries.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, TempCode: ${e.tempCode}, Circle: ${e.circle}, Subcircle: ${e.subcircle}, Qty: ${e.invoiceQty}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
