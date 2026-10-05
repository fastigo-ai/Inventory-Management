import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log('Scanning for orphaned StoreInwardEntries...');
    
    // Get all valid PI IDs
    const validPIs = await db.collection('purchaseinvoices').find({}, { projection: { _id: 1 } }).toArray();
    const validPIIds = validPIs.map(p => p._id);
    console.log(`Found ${validPIIds.length} valid PIs.`);

    // Delete StoreInwardEntries where purchaseInvoiceId is set but not in validPIIds
    const result = await db.collection('storeinwardentries').deleteMany({
      purchaseInvoiceId: { $exists: true, $nin: validPIIds }
    });
    
    console.log(`Deleted ${result.deletedCount} orphaned StoreInwardEntries.`);

    console.log('Done! Store Inward data is now clean.');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
