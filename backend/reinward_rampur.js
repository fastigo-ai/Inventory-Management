require('dotenv').config();
const mongoose = require('mongoose');

async function processRampurInwards() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const storeInwardEntries = db.collection('storeinwardentries');
  const purchaseInvoices = db.collection('purchaseinvoices');

  // Guard rails validation check - before doing anything
  const rampurEntriesBefore = await storeInwardEntries.countDocuments({ circle: { $regex: /^rampur$/i } });
  const solanNahanEntriesBefore = await storeInwardEntries.countDocuments({ circle: { $regex: /^(solan|nahan)$/i } });
  
  console.log(`[GUARD RAIL] Initial state: Rampur=${rampurEntriesBefore}, Solan/Nahan=${solanNahanEntriesBefore}`);
  
  // 1. DELETE ONLY RAMPUR ENTRIES
  console.log(`Deleting existing Rampur inward entries...`);
  const deleteResult = await storeInwardEntries.deleteMany({ circle: { $regex: /^rampur$/i } });
  console.log(`[GUARD RAIL] Deleted ${deleteResult.deletedCount} Rampur entries.`);

  // Verify deletion didn't touch Solan/Nahan
  const solanNahanEntriesAfterDelete = await storeInwardEntries.countDocuments({ circle: { $regex: /^(solan|nahan)$/i } });
  if (solanNahanEntriesAfterDelete !== solanNahanEntriesBefore) {
    console.error(`[GUARD RAIL FAILURE] Solan/Nahan count changed from ${solanNahanEntriesBefore} to ${solanNahanEntriesAfterDelete}. ABORTING!`);
    process.exit(1);
  }
  console.log(`[GUARD RAIL] Solan/Nahan count intact at ${solanNahanEntriesAfterDelete}.`);

  // 2. FETCH PURCHASE INVOICES WITH RAMPUR ITEMS
  console.log(`Fetching Purchase Invoices with Rampur line items...`);
  const invoices = await purchaseInvoices.find({
    'lineItems.circle': { $regex: /^rampur$/i }
  }).toArray();

  console.log(`Found ${invoices.length} invoices containing Rampur items.`);

  const newInwardEntries = [];

  for (const invoice of invoices) {
    // Only process line items that are specifically for Rampur
    const rampurLineItems = invoice.lineItems.filter(item => 
      item.circle && item.circle.toLowerCase() === 'rampur'
    );

    for (const item of rampurLineItems) {
      newInwardEntries.push({
        purchaseInvoiceId: invoice._id,
        purchaseOrderId: invoice.purchaseOrderId,
        poNumber: invoice.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: invoice.billingCompany?.name || invoice.billingFrom,
        vendorName: invoice.vendorName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date,
        diRefNo: invoice.diNumber || invoice.diNo,
        diId: item.diId || invoice.diId,
        circle: item.circle,
        subcircle: item.subcircle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
        totalQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
        rate: item.rate,
        amount: item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'Pending Receipt',
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  console.log(`Preparing to insert ${newInwardEntries.length} new StoreInwardEntry documents for Rampur.`);

  if (newInwardEntries.length > 0) {
    const insertResult = await storeInwardEntries.insertMany(newInwardEntries);
    console.log(`[GUARD RAIL] Successfully inserted ${insertResult.insertedCount} new Rampur inward entries.`);
  } else {
    console.log(`No Rampur line items found across the invoices!`);
  }

  // Final Verification
  const solanNahanEntriesFinal = await storeInwardEntries.countDocuments({ circle: { $regex: /^(solan|nahan)$/i } });
  const rampurEntriesFinal = await storeInwardEntries.countDocuments({ circle: { $regex: /^rampur$/i } });

  console.log(`\n============================`);
  console.log(`FINAL STATUS:`);
  console.log(`Rampur Entries (Before -> Final): ${rampurEntriesBefore} -> ${rampurEntriesFinal}`);
  console.log(`Solan/Nahan Entries (Before -> Final): ${solanNahanEntriesBefore} -> ${solanNahanEntriesFinal}`);
  console.log(`============================\n`);

  process.exit(0);
}

processRampurInwards().catch(console.error);
