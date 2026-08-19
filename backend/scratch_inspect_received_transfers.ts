import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreTransfer } from './src/modules/store/storeTransfer.schema';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function inspectReceivedTransfers() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const allTransfers = await StoreTransfer.find({}).lean();
  console.log(`Total StoreTransfer documents: ${allTransfers.length}\n`);

  console.log('--- ALL RECEIVED OR TO_STORE TRANSFERS ---');
  allTransfers.forEach((t: any) => {
    if (t.status === 'RECEIVED' || (t.toStore || '').toLowerCase().includes('nahan')) {
      console.log(`ID: ${t._id} | registerType: "${t.registerType}" | status: "${t.status}" | from: "${t.fromStore}" | to: "${t.toStore}" | items: ${t.items?.length || 0}`);
    }
  });

  await mongoose.disconnect();
}

inspectReceivedTransfers().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
