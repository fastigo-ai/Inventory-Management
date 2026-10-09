import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const Mhrov = mongoose.connection.collection('mhrovs');

  const circle = 'Nahan';

  const result = await Mhrov.updateMany(
    { circle: { $regex: new RegExp(`^${circle}$`, 'i') } },
    { $set: { status: 'Done' } }
  );

  console.log(`Updated ${result.modifiedCount} ${circle} MHROVs to status "Done"`);

  // Verify
  const count = await Mhrov.countDocuments({ circle: { $regex: new RegExp(`^${circle}$`, 'i') } });
  const doneCount = await Mhrov.countDocuments({ circle: { $regex: new RegExp(`^${circle}$`, 'i') }, status: 'Done' });
  console.log(`Total ${circle} MHROVs: ${count}, Status Done: ${doneCount}`);

  process.exit(0);
}

main().catch(console.error);
