require('dotenv').config();
const mongoose = require('mongoose');

const { StoreInwardEntry } = require('./src/modules/store/storeInwardEntry.schema');
const { SummaryService } = require('./src/modules/reports/summary/summary.service');

async function processRampurInwardsFinal() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const storeInwardEntriesRaw = db.collection('storeinwardentries');
  const purchaseInvoices = db.collection('purchaseinvoices');

  console.log(`Deleting existing Rampur inward entries to recreate with correct quantities...`);
  await storeInwardEntriesRaw.deleteMany({ circle: { $regex: /^rampur$/i } });

  console.log(`Fetching Purchase Invoices with Rampur line items...`);
  const invoices = await purchaseInvoices.find({
    'lineItems.circle': { $regex: /^rampur$/i }
  }).toArray();

  const newInwardEntries = [];
  const uniqueItemIds = new Set();

  for (const invoice of invoices) {
    const rampurLineItems = invoice.lineItems.filter(item => 
      item.circle && item.circle.toLowerCase() === 'rampur'
    );

    for (const item of rampurLineItems) {
      if (item.itemId) uniqueItemIds.add(item.itemId.toString());

      // Correctly fallback to item.quantity if totalInventory or invoiceQuantity is undefined/0
      const qty = item.invoiceQuantity || item.totalInventory || item.quantity || 0;

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
        invoiceQty: qty,
        totalQty: qty,
        challanQty: qty,
        srt: item.srt || 0,
        act: item.act || 0,
        rate: item.rate || 0,
        amount: item.amount || 0,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'Approved',
        entryType: 'INVOICE',
        packingList: [{ packType: 'BOX', quantity: qty }]
      });
    }
  }

  console.log(`Preparing to insert ${newInwardEntries.length} updated StoreInwardEntry documents for Rampur...`);

  if (newInwardEntries.length > 0) {
    const MongooseModel = mongoose.model('StoreInwardEntry');
    const insertResult = await MongooseModel.insertMany(newInwardEntries);
    console.log(`[FIXED] Successfully inserted ${insertResult.length} new Rampur inward entries.`);

    console.log(`Rebuilding Item Summaries for ${uniqueItemIds.size} unique items...`);
    let count = 0;
    for (const itemId of uniqueItemIds) {
      try {
        await SummaryService.rebuildForItem(itemId);
        count++;
        if (count % 50 === 0) console.log(`Rebuilt ${count}/${uniqueItemIds.size} items...`);
      } catch (err) {
        console.error(`Error rebuilding summary for item ${itemId}:`, err);
      }
    }
    console.log('All item summaries rebuilt successfully.');
  }

  process.exit(0);
}

processRampurInwardsFinal().catch(console.error);
