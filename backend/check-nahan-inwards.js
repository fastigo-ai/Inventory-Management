const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Nahan' })
    .toArray();
    
  console.log("=== ALL INWARDS IN NAHAN ===");
  inwards.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName} (TempCode: ${e.tempCode}), Qty: ${e.invoiceQty}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
