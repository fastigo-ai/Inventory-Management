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

    // Check StoreInwardEntries for this item in Nahan
    const entries = await db.collection('storeinwardentries').find({
      itemId: item._id,
      circle: { $regex: /^nahan$/i }
    }).toArray();

    console.log(`Found ${entries.length} StoreInwardEntries for tempCode 1 in Nahan`);
    let totalQty = 0;
    for (const e of entries) {
      const qty = Number(e.invoiceQty || e.acceptedQty || e.totalQty || 0);
      totalQty += qty;
      console.log(`  Entry: piId=${e.purchaseInvoiceId}, qty=${qty}, status=${e.status}`);
    }
    console.log(`Total inward qty: ${totalQty}`);

    // Also check if there are orphaned entries (PI deleted but entry still exists)
    const orphaned = [];
    for (const e of entries) {
      if (e.purchaseInvoiceId) {
        const pi = await db.collection('purchaseinvoices').findOne({ _id: e.purchaseInvoiceId });
        if (!pi) orphaned.push(e._id);
      }
    }
    console.log(`Orphaned entries (PI deleted): ${orphaned.length}`);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
