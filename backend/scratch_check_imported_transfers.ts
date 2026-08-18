import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function checkTransfers() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const transferCol = mongoose.connection.collection('storetransfers');
  const allTransfers = await transferCol.find({}).toArray();

  console.log(`Total StoreTransfers in database: ${allTransfers.length}\n`);

  allTransfers.forEach((t, index) => {
    console.log(`--- Transfer #${index + 1} ---`);
    console.log(`  ID: ${t._id}`);
    console.log(`  ChallanNo: "${t.challanNo}" | MIN No: "${t.minNo}"`);
    console.log(`  FromStore: "${t.fromStore}" | ToStore: "${t.toStore}"`);
    console.log(`  RegisterType: "${t.registerType}" | Status: "${t.status}"`);
    console.log(`  Items Count: ${(t.items || []).length}`);
    console.log(`  Created At: ${t.createdAt}`);
    console.log('');
  });

  await mongoose.disconnect();
}

checkTransfers().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
