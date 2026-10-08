require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, { strict: false, collection: 'mhrovs' }));
  
  const rohruMhrovs = await Mhrov.find({ circle: { $regex: /^Rohru$/i } });
  console.log(`Found ${rohruMhrovs.length} MHROVs for Rohru.`);

  if (rohruMhrovs.length > 0) {
    const result = await Mhrov.deleteMany({ circle: { $regex: /^Rohru$/i } });
    console.log(`Deleted ${result.deletedCount} MHROVs.`);
  }

  process.exit(0);
}
main().catch(console.error);
