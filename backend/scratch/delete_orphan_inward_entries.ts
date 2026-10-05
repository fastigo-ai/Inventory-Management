import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Find ALL StoreInwardEntries whose purchaseInvoiceId no longer exists
    console.log('Scanning for orphaned StoreInwardEntries...');
    const allEntries = await db.collection('storeinwardentries').find({}).project({ _id: 1, purchaseInvoiceId: 1 }).toArray();
    console.log(`Total entries: ${allEntries.length}`);

    const orphanIds: mongoose.Types.ObjectId[] = [];
    for (const entry of allEntries) {
      if (!entry.purchaseInvoiceId) continue;
      const pi = await db.collection('purchaseinvoices').findOne({ _id: entry.purchaseInvoiceId }, { projection: { _id: 1 } });
      if (!pi) {
        orphanIds.push(entry._id);
      }
    }

    console.log(`Found ${orphanIds.length} orphaned entries with no parent PI.`);

    if (orphanIds.length > 0) {
      const result = await db.collection('storeinwardentries').deleteMany({ _id: { $in: orphanIds } });
      console.log(`Deleted ${result.deletedCount} orphaned StoreInwardEntries.`);
    }

    console.log('Done! Store Inward data is now clean.');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
