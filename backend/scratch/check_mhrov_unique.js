require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const mhrovsColl = db.collection('mhrovs');
  
  const allMhrovs = await mhrovsColl.find({}).toArray();
  
  let circleMap = {};
  allMhrovs.forEach(m => {
    let circle = (m.circle || 'UNKNOWN').toUpperCase();
    if (!circleMap[circle]) circleMap[circle] = new Set();
    circleMap[circle].add(m.mhrovNumber);
  });

  console.log('--- Unique MHROV Numbers By Circle ---');
  for (const c in circleMap) {
    console.log(`[${c}]: ${circleMap[c].size} unique MHROV Numbers`);
  }
  
  mongoose.disconnect();
}
checkData().catch(console.error);
