require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const mhrovsColl = db.collection('mhrovs');
  
  const allMhrovs = await mhrovsColl.find({}).toArray();
  
  let stats = {};
  allMhrovs.forEach(m => {
    let circle = m.circle || 'UNKNOWN';
    let pkg = m.package || 'UNKNOWN';
    let key = `${circle} | ${pkg}`;
    if (!stats[key]) stats[key] = 0;
    stats[key]++;
  });

  console.log('--- MHROV Documents Count By Circle & Package ---');
  for (const k in stats) {
    console.log(`[${k}]: ${stats[k]} documents`);
  }
  mongoose.disconnect();
}
checkData().catch(console.error);
