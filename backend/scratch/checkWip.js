const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.useDb('test');
  const WipRegister = db.collection('wipregisters');
  
  const docs = await WipRegister.find({
    circle: { $regex: /SOLAN/i }
  }).toArray();
  
  console.log(`Found ${docs.length} total WIP records for SOLAN circle.`);
  const locs = docs.map(d => `${d.circle} - ${d.subDivision} - ${d.location}`);
  console.log('Sample locations:');
  console.log(locs.slice(0, 50));
  
  mongoose.disconnect();
}

run().catch(console.error);
