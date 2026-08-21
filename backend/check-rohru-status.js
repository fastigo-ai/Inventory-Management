const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const entries = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Rohru', invoiceQty: 170 })
    .toArray();
    
  console.log("=== ROHRU INWARDS WITH QTY 170 ===");
  entries.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, Qty: ${e.invoiceQty}, Status: ${e.status}, PackQty: ${e.packingList && e.packingList.length > 0 ? e.packingList[0].quantity : 'none'}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
