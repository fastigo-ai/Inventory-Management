const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Find all DocumentRelations where targetModule is PurchaseInvoice
    const piRelations = await db.collection('documentrelations').find({ targetModule: 'PurchaseInvoice' }).toArray();
    
    let orphanedCount = 0;
    
    for (const rel of piRelations) {
      // Check if the target PI exists
      const pi = await db.collection('purchaseinvoices').findOne({ _id: rel.targetDocument });
      if (!pi) {
        // PI does not exist, so delete the relation
        await db.collection('documentrelations').deleteOne({ _id: rel._id });
        orphanedCount++;
      }
    }

    console.log(`Successfully deleted ${orphanedCount} orphaned relations for deleted Purchase Invoices.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
