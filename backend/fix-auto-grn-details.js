const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const autoEntries = await mongoose.connection.collection('storeinwardentries').find({ inwardId: { $regex: /^INW-AUTO/ } }).toArray();
  console.log(`Found ${autoEntries.length} auto-generated entries. Populating missing details...`);

  let updatedCount = 0;
  for (const entry of autoEntries) {
    if (!entry.purchaseInvoiceId) continue;
    
    const pi = await mongoose.connection.collection('purchaseinvoices').findOne({ _id: entry.purchaseInvoiceId });
    if (!pi) continue;

    // Find the item in the PI to get exact amount if possible, or use PI totals
    const piItem = pi.lineItems.find(i => i.tempCode === entry.tempCode);
    
    await mongoose.connection.collection('storeinwardentries').updateOne(
      { _id: entry._id },
      { $set: { 
        vendorName: pi.vendorName || pi.billingFrom || '',
        invoiceNumber: pi.invoiceNumber || '',
        invoiceDate: pi.date ? new Date(pi.date) : null,
        amount: piItem ? Number(piItem.taxableAmount || 0) : 0,
        totalQty: piItem ? Number(piItem.quantity || 0) : entry.invoiceQty,
        description: entry.itemName || piItem?.description || '',
        poNumber: pi.purchaseOrderId ? String(pi.purchaseOrderId) : ''
      }}
    );
    updatedCount++;
  }

  console.log(`Successfully populated details for ${updatedCount} auto-generated entries.`);
  process.exit(0);
}
run().catch(console.error);
