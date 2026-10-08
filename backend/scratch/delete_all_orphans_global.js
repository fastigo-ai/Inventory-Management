const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  console.log("Fetching all store inward entries...");
  const entries = await db.collection('storeinwardentries').find({}).toArray();
  
  let deletedCount = 0;
  let historicalIgnored = 0;
  let totalProcessed = 0;
  
  for (const entry of entries) {
    totalProcessed++;
    if (entry.entryType === 'HISTORICAL') {
       historicalIgnored++;
       continue;
    }
    
    let isOrphan = false;
    if (entry.purchaseInvoiceId) {
      const pi = await db.collection('purchaseinvoices').findOne({ _id: entry.purchaseInvoiceId });
      if (!pi) {
        isOrphan = true;
      }
    } else {
      isOrphan = true;
    }
    
    if (isOrphan) {
      await db.collection('storeinwardentries').deleteOne({ _id: entry._id });
      deletedCount++;
    }
    
    if (totalProcessed % 500 === 0) {
       console.log(`Processed ${totalProcessed}/${entries.length}... deleted ${deletedCount} so far.`);
    }
  }
  
  console.log('\n--- GLOBAL CLEANUP COMPLETE ---');
  console.log('Total entries scanned:', entries.length);
  console.log('Orphaned Store Receipts/IRs deleted globally:', deletedCount);
  console.log('Historical (opening balances) ignored:', historicalIgnored);
  
  process.exit(0);
}

run().catch(console.error);
