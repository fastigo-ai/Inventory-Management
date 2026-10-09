import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const DI = mongoose.connection.collection('dis');
  const Mhrov = mongoose.connection.collection('mhrovs');

  const diSample = await DI.findOne({});
  console.log('Sample DI:', JSON.stringify(diSample, null, 2));

  const mhrovSample = await Mhrov.findOne({});
  console.log('Sample MHROV:', JSON.stringify(mhrovSample, null, 2));

  // Find MHROVs for Solan
  const solanMhrovs = await Mhrov.find({ circle: /Solan/i }).limit(2).toArray();
  console.log(`Found ${solanMhrovs.length} MHROVs with circle=/Solan/i`);

  // Find MHROVs for Nahan
  const nahanMhrovs = await Mhrov.find({ circle: /Nahan/i }).limit(2).toArray();
  console.log(`Found ${nahanMhrovs.length} MHROVs with circle=/Nahan/i`);

  // Find DIs for Solan
  const solanDIs = await DI.find({ $or: [{ circle: /Solan/i }, { 'lineItems.circle': /Solan/i }] }).limit(2).toArray();
  console.log(`Found ${solanDIs.length} DIs with circle=/Solan/i`);

  process.exit(0);
}

main().catch(console.error);
