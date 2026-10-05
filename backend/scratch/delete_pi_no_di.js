const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Fetch all PIs
    const pis = await db.collection('purchaseinvoices').find({}).toArray();
    
    // Fetch all valid DI numbers in the system
    const dis = await db.collection('dis').find({}, { projection: { diNumber: 1 } }).toArray();
    const validDiNumbers = new Set(dis.map(d => d.diNumber));

    const pisToDelete = [];
    const affectedItemIds = new Set();

    for (const pi of pis) {
      let diNumbersInPi = new Set();
      if (pi.diNumber) diNumbersInPi.add(pi.diNumber);
      
      if (pi.lineItems) {
        for (const item of pi.lineItems) {
          if (item.diNumber) diNumbersInPi.add(item.diNumber);
        }
      }

      if (diNumbersInPi.size === 0) {
        pisToDelete.push(pi._id);
        if (pi.lineItems) {
          for (const item of pi.lineItems) {
            if (item.itemId) affectedItemIds.add(item.itemId.toString());
          }
        }
      }
    }

    console.log(`Found ${pisToDelete.length} PIs with no DI linked. Deleting them...`);

    if (pisToDelete.length > 0) {
      const deletePiResult = await db.collection('purchaseinvoices').deleteMany({ _id: { $in: pisToDelete } });
      console.log(`Deleted ${deletePiResult.deletedCount} Purchase Invoices.`);

      const deleteIrResult = await db.collection('storeinwardentries').deleteMany({ purchaseInvoiceId: { $in: pisToDelete } });
      console.log(`Deleted ${deleteIrResult.deletedCount} related Store Inward Entries.`);
      
      console.log(`Note: ${affectedItemIds.size} items had their summaries affected. You may want to rebuild summaries later if needed.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
