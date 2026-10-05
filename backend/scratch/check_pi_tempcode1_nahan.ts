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
    if (!item) { console.log('Item not found'); process.exit(0); }
    console.log('Item:', item.dynamicData.name, item._id.toString());

    // Check all PIs for this item in Nahan
    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': item._id }).toArray();
    let totalQty = 0;
    let nahanCount = 0;
    for (const pi of pis) {
      for (const line of pi.lineItems) {
        if (line.itemId.toString() === item._id.toString()) {
          const circle = (line.circle || '').toLowerCase();
          if (circle === 'nahan') {
            const qty = Number(line.quantity) || 0;
            totalQty += qty;
            nahanCount++;
            console.log(`  PI: ${pi.invoiceNumber}, Qty: ${qty}, Package: "${line.package}"`);
          }
        }
      }
    }
    console.log(`Total Nahan PI lines: ${nahanCount}, Total Qty: ${totalQty}`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
