import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function inspectInward() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);

  const count = await StoreInwardEntry.countDocuments();
  console.log(`Total StoreInwardEntry documents: ${count}`);

  const sample = await StoreInwardEntry.find().limit(10).lean();
  console.log('Sample StoreInwardEntry records:');
  for (const s of sample) {
    console.log({
      inwardId: s.inwardId,
      itemName: s.itemName,
      itemId: s.itemId,
      tempCode: s.tempCode,
      serialNumber: s.serialNumber,
      circle: s.circle,
      package: s.package,
      invoiceQty: s.invoiceQty,
      acceptedQty: s.acceptedQty
    });
  }

  // Check specifically for STP 9 MTR
  const stpRecords = await StoreInwardEntry.find({
    itemName: /STP 9 MTR/i
  }).lean();
  console.log(`\nSTP 9 MTR StoreInwardEntries (${stpRecords.length} records):`);
  for (const s of stpRecords) {
    console.log({
      inwardId: s.inwardId,
      itemName: s.itemName,
      itemId: s.itemId,
      tempCode: s.tempCode,
      serialNumber: s.serialNumber,
      circle: s.circle,
      invoiceQty: s.invoiceQty
    });
  }

  await mongoose.disconnect();
}

inspectInward().catch(console.error);
