require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const mhrovsColl = db.collection('mhrovs');
  const disColl = db.collection('dis');

  const rohruMhrovs = await mhrovsColl.find({ circle: /rohru/i }).toArray();
  const rohruDis = await disColl.find({ circle: /rohru/i }).toArray();

  let totalMhrovQtyInMhrovs = 0;
  rohruMhrovs.forEach(m => {
    m.items?.forEach(item => {
      totalMhrovQtyInMhrovs += (item.mhrovDoneQty || 0);
    });
  });

  let totalQtyInDis = 0;
  let totalMhrovQtyInDis = 0;
  rohruDis.forEach(d => {
    d.lineItems?.forEach(item => {
      totalQtyInDis += (item.quantity || 0);
      totalMhrovQtyInDis += (item.mhrovDoneQty || 0);
    });
  });

  console.log('--- Rohru Circle Data Summary ---');
  console.log(`Total MHROVs: ${rohruMhrovs.length}`);
  console.log(`Total MHROV Done Qty in MHROVs collection: ${totalMhrovQtyInMhrovs}`);
  
  console.log(`\nTotal DIs: ${rohruDis.length}`);
  console.log(`Total Quantity in DIs collection: ${totalQtyInDis}`);
  console.log(`Total MHROV Done Qty in DIs collection (tracked field): ${totalMhrovQtyInDis}`);
  
  if (totalMhrovQtyInMhrovs === totalMhrovQtyInDis) {
    console.log('\n✅ MHROV quantities MATCH between MHROV collection and DI collection tracking.');
  } else {
    console.log(`\n❌ MHROV quantities DO NOT MATCH. Difference: ${Math.abs(totalMhrovQtyInMhrovs - totalMhrovQtyInDis)}`);
  }

  mongoose.disconnect();
}

checkData().catch(console.error);
