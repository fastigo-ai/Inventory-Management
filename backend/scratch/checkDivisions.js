const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.useDb('test');
  const WipRegister = db.collection('wipregisters');
  
  const docs = await WipRegister.find({
    circle: { $regex: /SOLAN/i },
    subDivision: { $regex: /Manpura|Baddi/i }
  }).toArray();
  
  console.log(`Found ${docs.length} total WIP records for SOLAN -> Manpura/Baddi`);
  
  const locs = docs.map(d => {
    return `Location: ${d.location} | Circle: ${d.circle} | Division: ${d.division || 'N/A'} | SubDivision: ${d.subDivision}`;
  });
  
  console.log('Sample locations:');
  console.log(locs.slice(0, 10));
  
  mongoose.disconnect();
}

run().catch(console.error);
