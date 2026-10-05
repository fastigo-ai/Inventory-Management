import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const items = await db.collection('items').find({ 'dynamicData.tempCode': '1' }).project({ _id: 1 }).toArray();
    const itemIds = items.map(i => i._id);

    const entries = await db.collection('storeinwardentries').find({
      itemId: { $in: itemIds },
      circle: { $regex: /^rampur$/i }
    }).toArray();
    
    let totalQty = 0;
    for (const e of entries) {
      totalQty += Number(e.invoiceQty || e.acceptedQty || e.totalQty || 0);
    }
    console.log('Total Inward (IR) qty for Rampur tempCode 1:', totalQty);

    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': { $in: itemIds } }).toArray();
    let totalPI = 0;
    for (const pi of pis) {
      for (const line of pi.lineItems) {
        if (itemIds.some(id => id.toString() === line.itemId.toString()) && (line.circle || '').toLowerCase() === 'rampur') {
          totalPI += Number(line.quantity) || 0;
        }
      }
    }
    console.log('Total Actual PI qty for Rampur tempCode 1:', totalPI);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
