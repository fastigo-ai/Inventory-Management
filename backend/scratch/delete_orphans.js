const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const entries = await db.collection('storeinwardentries').find({}).toArray();
  
  let deletedCount = 0;
  let historicalIgnored = 0;
  
  for (const entry of entries) {
    const isNalagarh = entry.subcircle && entry.subcircle.toLowerCase().includes('nalagarh');
    if (!isNalagarh) continue;
    
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
  }
  
  console.log('Orphaned Store Receipts deleted for Nalagarh store:', deletedCount);
  console.log('Historical (opening balances) ignored for Nalagarh store:', historicalIgnored);
  
  process.exit(0);
}

run().catch(console.error);
