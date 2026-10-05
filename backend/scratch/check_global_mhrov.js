require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const mhrovsColl = db.collection('mhrovs');
  const disColl = db.collection('dis');

  const allMhrovs = await mhrovsColl.find({}).toArray();
  const allDis = await disColl.find({}).toArray();

  let totalMhrovsCount = allMhrovs.length;
  let totalDisCount = allDis.length;
  
  let mhrovQtyInMhrovs = 0;
  let circlesInMhrovs = {};

  allMhrovs.forEach(m => {
    let circle = m.circle || 'UNKNOWN';
    if (!circlesInMhrovs[circle]) circlesInMhrovs[circle] = 0;
    
    m.items?.forEach(item => {
      let qty = (item.mhrovDoneQty || 0);
      mhrovQtyInMhrovs += qty;
      circlesInMhrovs[circle] += qty;
    });
  });

  let diMhrovTrackedQty = 0;
  let circlesInDis = {};

  allDis.forEach(d => {
    let circle = d.circle || 'UNKNOWN';
    if (!circlesInDis[circle]) circlesInDis[circle] = 0;
    
    d.lineItems?.forEach(item => {
      let qty = (item.mhrovDoneQty || 0);
      diMhrovTrackedQty += qty;
      circlesInDis[circle] += qty;
    });
  });

  console.log('--- GLOBAL SUMMARY ---');
  console.log(`Total MHROV Documents: ${totalMhrovsCount}`);
  console.log(`Total DI Documents: ${totalDisCount}`);
  console.log(`\nGlobal MHROV Qty in MHROV collection: ${mhrovQtyInMhrovs}`);
  console.log(`Global tracked mhrovDoneQty in DI collection: ${diMhrovTrackedQty}`);
  
  console.log('\n--- BY CIRCLE (MHROV Collection vs DI Collection Tracking) ---');
  const allCircles = new Set([...Object.keys(circlesInMhrovs), ...Object.keys(circlesInDis)]);
  
  for (const c of allCircles) {
    let inMhrov = circlesInMhrovs[c] || 0;
    let inDi = circlesInDis[c] || 0;
    console.log(`Circle [${c}]: MHROV Col = ${inMhrov} | DI Tracked = ${inDi} | Diff = ${Math.abs(inMhrov - inDi)}`);
  }

  mongoose.disconnect();
}

checkData().catch(console.error);
