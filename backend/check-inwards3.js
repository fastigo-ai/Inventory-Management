const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ tempCode: { $in: ["7", "20", "127", "83"] } })
    .toArray();
    
  console.log("=== INWARDS FOR DN ITEMS ===");
  inwards.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, TempCode: ${e.tempCode}, Circle: "${e.circle}", Subcircle: "${e.subcircle}", Qty: ${e.invoiceQty}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
