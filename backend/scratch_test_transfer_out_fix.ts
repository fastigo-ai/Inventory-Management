import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreTransfer } from './src/modules/store/storeTransfer.schema';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function testTransferOut() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  console.log('--- AUDITING STORE TRANSFERS COLLECTION ---');

  const allTransfers = await StoreTransfer.find({ status: { $ne: 'REJECTED' as any } }).lean();
  console.log(`Total valid StoreTransfer documents: ${allTransfers.length}`);

  const outwardOnly = allTransfers.filter(t => t.registerType === 'OUTWARD');
  const inwardOnly = allTransfers.filter(t => t.registerType === 'INWARD');

  console.log(`• Documents with registerType === 'OUTWARD': ${outwardOnly.length}`);
  console.log(`• Documents with registerType === 'INWARD': ${inwardOnly.length}`);

  let outwardDispatchedSum = 0;
  outwardOnly.forEach((doc: any) => {
    (doc.items || []).forEach((it: any) => {
      outwardDispatchedSum += Number(it.dispatchedQty || it.quantity || it.requestedQty || 0);
    });
  });

  let inwardReceivedSum = 0;
  inwardOnly.forEach((doc: any) => {
    (doc.items || []).forEach((it: any) => {
      inwardReceivedSum += Number(it.receivedQty || it.dispatchedQty || it.quantity || 0);
    });
  });

  console.log(`\n• Total Dispatched Qty in OUTWARD Register: ${outwardDispatchedSum.toLocaleString()}`);
  console.log(`• Total Received Qty in INWARD Register: ${inwardReceivedSum.toLocaleString()}`);

  console.log('\n--- STORE WISE DISPATCHED SUMMARY (OUTWARD REGISTER ONLY) ---');
  const stores = ['Nahan', 'Solan', 'Kumarhatti', 'Rampur', 'Nalagarh', 'Noida', 'Head Office'];
  for (const s of stores) {
    const sOut = outwardOnly.filter(t => (t.fromStore || '').toLowerCase().includes(s.toLowerCase()));
    let sQty = 0;
    sOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        sQty += Number(it.dispatchedQty || it.quantity || it.requestedQty || 0);
      });
    });
    console.log(`  • Store "${s}": ${sOut.length} Outward Transfers | Total Dispatched: ${sQty.toLocaleString()}`);
  }

  await mongoose.disconnect();
}

testTransferOut().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
