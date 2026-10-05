import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const item = await db.collection('items').findOne({ 'dynamicData.tempCode': '1' });
    if (!item) { console.log('Not found'); process.exit(0); }

    const summaries = await db.collection('itemsummaries').find({ itemId: item._id, circle: { $regex: /^rampur$/i } }).toArray();
    console.log('--- Rampur Summaries ---');
    for (const s of summaries) {
      console.log(`package: "${s.package}", loaQty: ${s.loaQty}, bomQty: ${s.bomQty}, diQty: ${s.diQty}, invQty: ${s.invQty}`);
    }

    const PIs = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': item._id }).toArray();
    let totalRampurPI = 0;
    for (const pi of PIs) {
      for (const line of pi.lineItems) {
        if (line.itemId.toString() === item._id.toString() && (line.circle || '').toLowerCase() === 'rampur') {
          totalRampurPI += Number(line.quantity) || 0;
        }
      }
    }
    console.log('Total Rampur PI qty:', totalRampurPI);

    const DIs = await db.collection('dis').find({ 'lineItems.itemId': item._id }).toArray();
    let totalRampurDI = 0;
    for (const di of DIs) {
      for (const line of di.lineItems) {
        if (line.itemId.toString() === item._id.toString() && (line.circle || '').toLowerCase() === 'rampur') {
          totalRampurDI += Number(line.quantity) || 0;
        }
      }
    }
    console.log('Total Rampur DI qty:', totalRampurDI);

    const inward = await db.collection('storeinwardentries').find({ itemId: item._id, circle: { $regex: /^rampur$/i } }).toArray();
    let totalRampurInward = 0;
    for (const e of inward) {
      totalRampurInward += Number(e.invoiceQty || e.acceptedQty || e.totalQty || 0);
    }
    console.log('Total Rampur Inward qty:', totalRampurInward);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
