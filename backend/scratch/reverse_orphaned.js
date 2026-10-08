const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  // Find all store inward entries
  const entries = await db.collection('storeinwardentries').find({ status: 'Approved' }).toArray();
  
  let orphanedCount = 0;
  for (const entry of entries) {
    if (entry.purchaseInvoiceId) {
      const pi = await db.collection('purchaseinvoices').findOne({ _id: entry.purchaseInvoiceId });
      if (!pi) {
        orphanedCount++;
        // Reverse it!
        await db.collection('storeinwardentries').updateOne(
          { _id: entry._id },
          { $set: { status: 'Pending Receipt' } }
        );
      }
    }
  }
  
  console.log('Orphaned Approved items reversed:', orphanedCount);
  process.exit(0);
}

run().catch(console.error);
