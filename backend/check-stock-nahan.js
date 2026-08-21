const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Nahan', tempCode: "1" }) // STP 9 MTR
    .toArray();
    
  console.log("=== INWARDS FOR TEMPCODE 1 IN NAHAN ===");
  console.log(`Found ${inwards.length} entries.`);
  inwards.forEach(e => {
    console.log(`ID: ${e._id}, Item: ${e.itemName}, Qty: ${e.invoiceQty}`);
  });
  
  const allInwards = await mongoose.connection.collection('storeinwardentries')
    .find({ tempCode: "1" }) // STP 9 MTR
    .toArray();
    
  console.log("=== ALL INWARDS FOR TEMPCODE 1 ===");
  const circleCounts = {};
  allInwards.forEach(e => {
    circleCounts[e.circle] = (circleCounts[e.circle] || 0) + (e.invoiceQty || 0);
  });
  console.log(circleCounts);
  
  process.exit(0);
}
run().catch(console.error);
