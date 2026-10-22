import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const col = db.collection('storeinwardentries');

  // Let's inspect 5 entries with store: Nalagarh
  const sampleNalagarh = await col.find({ store: /nalagarh/i }).limit(3).toArray();
  console.log('Sample Nalagarh entries:', JSON.stringify(sampleNalagarh, null, 2));

  // Let's inspect 5 entries with store undefined/null/empty in circle Solan
  const sampleSolan = await col.find({ circle: /solan/i, $or: [{ store: null }, { store: { $exists: false } }, { store: '' }] }).limit(3).toArray();
  console.log('Sample Solan unassigned store entries:', JSON.stringify(sampleSolan, null, 2));

  await mongoose.disconnect();
}
run().catch(console.error);
