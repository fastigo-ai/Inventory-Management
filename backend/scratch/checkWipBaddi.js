const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.useDb('test');
  const WipRegister = db.collection('wipregisters');
  const Contractors = db.collection('contractors');
  
  const docs = await WipRegister.find({
    circle: { $regex: /SOLAN/i },
    subDivision: { $regex: /Manpura|Baddi/i }
  }).toArray();
  
  console.log(`Found ${docs.length} total WIP records for SOLAN -> Manpura/Baddi`);
  
  const locs = await Promise.all(docs.map(async d => {
    let contractorName = 'Unknown';
    if (d.contractorId) {
       const contractor = await Contractors.findOne({ _id: d.contractorId });
       if (contractor) contractorName = contractor.name || contractor.dynamicData?.companyName || contractor.dynamicData?.name || 'Found but unnamed';
    }
    return `${d.circle} - ${d.subDivision} - ${d.location} (Contractor: ${contractorName})`;
  }));
  
  console.log('Sample locations:');
  console.log(locs.slice(0, 20));
  
  mongoose.disconnect();
}

run().catch(console.error);
