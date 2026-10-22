import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';

async function checkInwards() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const docs = await StoreInwardEntry.find({
    status: { $ne: 'Voided' },
    circle: /solan/i,
    tempCode: '1'
  }).lean();
  console.log('StoreInwardEntry docs for Solan TC 1:', docs.length);
  const totalInvQty = docs.reduce((a, b) => a + Number(b.invoiceQty || b.acceptedQty || b.totalQty || 0), 0);
  console.log('Total Inward Qty from StoreInwardEntry directly:', totalInvQty);
  for (const d of docs) {
    console.log(d.grnNo, d.invoiceNo, 'invQty:', d.invoiceQty, 'loaSrNo:', d.loaSerialNo || (d as any).loaSrNo);
  }
  await mongoose.disconnect();
}
checkInwards().catch(console.error);
