const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find all inwards in Solan or Nahan
  const entries = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: { $in: ["Solan", "Nahan", "Solan "] } })
    .toArray();
    
  console.log("=== INWARDS IN NAHAN OR SOLAN ===");
  entries.slice(0, 10).forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, TempCode: ${e.tempCode}, Circle: ${e.circle}, Qty: ${e.invoiceQty}`);
  });
  
  console.log(`Total found: ${entries.length}`);
  
  // Also check if any DI matches 170 qty in Nahan
  const dis = await mongoose.connection.collection('dis')
    .find({ 'destinations.circle': 'Nahan', 'destinations.quantity': 170 })
    .toArray();
    
  console.log(`\n=== DIs WITH 170 QTY FOR NAHAN ===`);
  dis.forEach(di => {
    console.log(`DI Ref: ${di.diRefNo}, Item: ${di.itemDescription}, Qty: ${di.quantity}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
