import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function inspectOutwards() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const collections = await mongoose.connection.db?.listCollections().toArray();
  console.log('All Collections in MongoDB:');
  collections?.forEach(c => console.log(` • ${c.name}`));

  console.log('\nChecking StoreTransfer documents:');
  const stCol = mongoose.connection.collection('storetransfers');
  const stCount = await stCol.countDocuments({});
  console.log(`Total StoreTransfer docs: ${stCount}`);
  const sampleSt = await stCol.find({}).limit(2).toArray();
  console.log('Sample StoreTransfer:', JSON.stringify(sampleSt, null, 2));

  // Check if there is an outward registers collection
  for (const c of collections || []) {
    if (c.name.toLowerCase().includes('outward')) {
      const col = mongoose.connection.collection(c.name);
      const cnt = await col.countDocuments({});
      console.log(`\nCollection "${c.name}": ${cnt} docs`);
      const smp = await col.find({}).limit(2).toArray();
      console.log(`Sample from "${c.name}":`, JSON.stringify(smp, null, 2));
    }
  }

  await mongoose.disconnect();
}

inspectOutwards().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
