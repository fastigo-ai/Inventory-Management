const mongoose = require('mongoose');
const { calculateContractorLiability } = require('./src/modules/contractors/contractor.helper');

require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection;
  
  const contractor = await db.collection('contractors').findOne({ $or: [{ 'dynamicData.displayName': /Gian Chand/i }, { 'name': /Gian Chand/i }, { 'displayName': /Gian Chand/i }] });
  
  if (!contractor) {
    console.log('Contractor not found');
    process.exit(0);
  }
  
  const map = await calculateContractorLiability(contractor._id.toString());
  
  const keys = Object.keys(map).filter(k => k.includes('1331'));
  console.log('Keys matching 1331:', keys);
  for (const k of keys) {
    console.log(`Data for ${k}:`, map[k]);
  }
  
  process.exit(0);
}

run().catch(console.error);
