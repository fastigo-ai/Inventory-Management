require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const mhrovsColl = db.collection('mhrovs');
  const disColl = db.collection('dis');

  // Find all DIs for Rohru
  const rohruDis = await disColl.find({ circle: /rohru/i }).toArray();
  const rohruDiIds = rohruDis.map(di => di._id.toString());

  // Find all MHROVs that reference any Rohru DI
  const allMhrovs = await mhrovsColl.find({}).toArray();
  
  let totalMhrovQtyInMhrovsForRohruDIs = 0;
  
  allMhrovs.forEach(m => {
    m.items?.forEach(item => {
      if (item.diId && rohruDiIds.includes(item.diId.toString())) {
        totalMhrovQtyInMhrovsForRohruDIs += (item.mhrovDoneQty || 0);
      }
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
  console.log(`Total MHROV Done Qty in MHROVs collection (linked to Rohru DIs): ${totalMhrovQtyInMhrovsForRohruDIs}`);
  console.log(`Total MHROV Done Qty tracked in DIs collection for Rohru: ${totalMhrovQtyInDis}`);
  
  if (totalMhrovQtyInMhrovsForRohruDIs === totalMhrovQtyInDis) {
    console.log('\n✅ MATCH: The sum of mhrovDoneQty in the MHROV collection matches the tracked mhrovDoneQty in the DI collection for Rohru.');
  } else {
    console.log(`\n❌ MISMATCH: Difference is ${Math.abs(totalMhrovQtyInMhrovsForRohruDIs - totalMhrovQtyInDis)}`);
  }

  mongoose.disconnect();
}

checkData().catch(console.error);
