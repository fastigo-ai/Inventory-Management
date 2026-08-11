require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Looking for orphaned Store Receipts...");
    
    // Find all store inward entries
    const entries = await db.collection('storeinwardentries').find({}).toArray();
    console.log(`Found ${entries.length} total inward entries.`);
    
    // Fetch all existing purchase invoices
    const invoices = await db.collection('purchaseinvoices').find({}, { projection: { _id: 1 } }).toArray();
    const invoiceIds = new Set(invoices.map(inv => inv._id.toString()));
    
    console.log(`Found ${invoiceIds.size} existing purchase invoices.`);
    
    let deletedCount = 0;
    const deleteIds = [];
    
    for (const entry of entries) {
      if (entry.purchaseInvoiceId && !invoiceIds.has(entry.purchaseInvoiceId.toString())) {
        deleteIds.push(entry._id);
        deletedCount++;
      }
    }
    
    if (deleteIds.length > 0) {
      console.log(`Deleting ${deleteIds.length} orphaned store inward entries...`);
      // Delete them in chunks
      const chunkSize = 1000;
      for (let i = 0; i < deleteIds.length; i += chunkSize) {
        const chunk = deleteIds.slice(i, i + chunkSize);
        await db.collection('storeinwardentries').deleteMany({ _id: { $in: chunk } });
      }
      console.log("Successfully deleted orphaned entries.");
    } else {
      console.log("No orphaned entries found.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

cleanup();
