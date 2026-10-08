require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({
    circle: String,
    status: String
  }, { strict: false, collection: 'mhrovs' }));
  
  const result = await Mhrov.updateMany(
    { circle: { $regex: /^Rohru$/i } },
    { $set: { status: 'Done' } }
  );

  console.log(`Updated status to 'Done' for ${result.modifiedCount} MHROVs out of ${result.matchedCount} matched MHROVs for Rohru.`);

  process.exit(0);
}
main().catch(console.error);
