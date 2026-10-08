const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  // 1. Get all valid PI IDs in memory
  const allPIs = await db.collection('purchaseinvoices').find({}, { projection: { _id: 1 } }).toArray();
  const validPiIds = new Set(allPIs.map(pi => pi._id.toString()));
  
  console.log(`Found ${validPiIds.size} total valid Purchase Invoices.`);
  
  // 2. Fetch Nalagarh inward entries (case-insensitive subcircle)
  const entries = await db.collection('storeinwardentries').find({
    subcircle: { $regex: /nalagarh/i },
    entryType: { $ne: 'HISTORICAL' }
  }).toArray();
  
  let deletedCount = 0;
  
  for (const entry of entries) {
    let isOrphan = false;
    
    if (entry.purchaseInvoiceId) {
      if (!validPiIds.has(entry.purchaseInvoiceId.toString())) {
        isOrphan = true;
      }
    } else {
      // If it doesn't even have a PI ID (and it's not HISTORICAL), it's considered an orphan
      isOrphan = true;
    }
    
    if (isOrphan) {
      await db.collection('storeinwardentries').deleteOne({ _id: entry._id });
      deletedCount++;
    }
  }
  
  console.log(`Successfully deleted ${deletedCount} orphaned Store Receipts for Nalagarh store.`);
  
  process.exit(0);
}

run().catch(console.error);
