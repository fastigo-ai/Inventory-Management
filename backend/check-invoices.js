const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Nahan' })
    .toArray();
    
  let totalQty = 0;
  inwards.forEach(e => {
    totalQty += (e.invoiceQty || 0);
  });
  
  console.log(`Total inwards in Nahan: ${inwards.length}, Total Qty: ${totalQty}`);
  
  // Find any inwards in Nahan where invoiceQty is 170 or totalQty is 170 or something similar
  const inwards170 = inwards.filter(e => e.invoiceQty === 170 || e.totalQty === 170 || (e.packingList && e.packingList.some(p => p.quantity === 170)));
  console.log(`Inwards with qty 170 in Nahan: ${inwards170.length}`);
  
  // What about Solan?
  const solanInwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: 'Solan' })
    .toArray();
  const solan170 = solanInwards.filter(e => e.invoiceQty === 170 || e.totalQty === 170 || (e.packingList && e.packingList.some(p => p.quantity === 170)));
  console.log(`Inwards with qty 170 in Solan: ${solan170.length}`);
  
  // Wait, let's look at the Demand Notes for Nahan. The user is trying to create a MIN against a Demand Note in Nahan.
  const dns = await mongoose.connection.collection('demandnotes')
    .find({ 'items.demandQty': { $gt: 0 } }) // or just fetch the most recent ones
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
  console.log("\n=== RECENT DEMAND NOTES ===");
  dns.forEach(dn => {
    console.log(`DN: ${dn.demandNoteNumber}, Contractor: ${dn.contractorName}, Circle: ${dn.circle || dn.division}`);
    dn.items.forEach(item => {
      console.log(`  - Item: ${item.itemName} (TempCode: ${item.tempCode}), Qty: ${item.demandQty}`);
    });
  });

  process.exit(0);
}
run().catch(console.error);
