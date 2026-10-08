const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  // 1. Get all valid PI IDs in memory
  const allPIs = await db.collection('purchaseinvoices').find({}, { projection: { _id: 1 } }).toArray();
  const validPiIds = allPIs.map(pi => pi._id);
  
  // 2. Delete orphaned items for Nalagarh store.
  // An item is an orphan if its entryType is not 'HISTORICAL' and
  // its purchaseInvoiceId is either missing, or NOT in the validPiIds list.
  
  const result = await db.collection('storeinwardentries').deleteMany({
    entryType: { $ne: 'HISTORICAL' },
    subcircle: { $regex: /nalagarh/i },
    $or: [
      { purchaseInvoiceId: { $exists: false } },
      { purchaseInvoiceId: null },
      { purchaseInvoiceId: { $nin: validPiIds } }
    ]
  });
  
  console.log(`Successfully deleted ${result.deletedCount} orphaned Store Receipts for Nalagarh store.`);
  
  process.exit(0);
}

run().catch(console.error);
