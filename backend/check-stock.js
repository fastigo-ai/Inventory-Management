const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Nahan', $or: [{ invoiceQty: 170 }, { totalQty: 170 }, { 'packingList.quantity': 170 }] })
    .toArray();
    
  console.log("=== INWARDS IN NAHAN WITH QTY 170 ===");
  inwards.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, TempCode: ${e.tempCode}, Status: ${e.status}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
