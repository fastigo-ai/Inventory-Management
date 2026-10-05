require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const mhrovsColl = db.collection('mhrovs');
  
  const allMhrovs = await mhrovsColl.find({}).toArray();
  
  let circleCounts = {};
  allMhrovs.forEach(m => {
    let circle = m.circle || 'UNKNOWN';
    if (!circleCounts[circle]) circleCounts[circle] = 0;
    circleCounts[circle]++;
  });

  console.log('--- MHROV Documents Count By Circle ---');
  for (const c in circleCounts) {
    console.log(`Circle [${c}]: ${circleCounts[c]} documents`);
  }

  mongoose.disconnect();
}

checkData().catch(console.error);
