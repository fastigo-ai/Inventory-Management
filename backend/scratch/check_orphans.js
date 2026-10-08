const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  // Find all store inward entries
  const entries = await db.collection('storeinwardentries').find({}).toArray();
  
  let orphanedCount = 0;
  let nalagarhOrphans = 0;
  let historicalNalagarh = 0;
  
  for (const entry of entries) {
    const isNalagarh = entry.subcircle && entry.subcircle.toLowerCase() === 'nalagarh';
    
    if (entry.entryType === 'HISTORICAL' && isNalagarh) {
       historicalNalagarh++;
       continue; // We'll count them separately to know if we should ask the user
    }
    
    let isOrphan = false;
    
    if (entry.purchaseInvoiceId) {
      const pi = await db.collection('purchaseinvoices').findOne({ _id: entry.purchaseInvoiceId });
      if (!pi) {
        isOrphan = true;
      }
    } else {
      // If it doesn't even have a purchaseInvoiceId (and not historical)
      isOrphan = true;
    }
    
    if (isOrphan) {
      orphanedCount++;
      if (isNalagarh) {
        nalagarhOrphans++;
      }
    }
  }
  
  console.log('Total Orphans (No PI or Deleted PI):', orphanedCount);
  console.log('Nalagarh Orphans:', nalagarhOrphans);
  console.log('Nalagarh Historical (Ignored by orphan check):', historicalNalagarh);
  
  process.exit(0);
}

run().catch(console.error);
