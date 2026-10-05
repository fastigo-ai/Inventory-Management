const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find Contractor Invoices that might be the one uploaded recently
    // Look for ones with isLegacyBulkUpload (if we have a flag) or legacyMetadata
    const invoices = await db.collection('contractorinvoices').find({
      legacyMetadata: { $exists: true }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`Found ${invoices.length} legacy invoices. Looking for the Solan one...`);
    
    for (const inv of invoices) {
      console.log(`\nInvoice ID: ${inv._id}, Invoice No: ${inv.invoiceNumber}, Status: ${inv.status}`);
      console.log(`Legacy Metadata Circle: ${inv.legacyMetadata?.circle}, Package: ${inv.legacyMetadata?.package}`);
      
      // Let's just update the most recent one that seems to belong to Solan, 
      // or if there's one with circle "Solan" but package "Package 2(R/R)" or something mismatched.
      // Wait, user said "the erection bill that was uploaded for solan cicle from the solan site portal fix that makr the circle to solan and the package should be Package 1(S/N)"
      // Let's just update all legacy invoices created in the last day that belong to solan user, or we can just update the one with mismatched data.
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
