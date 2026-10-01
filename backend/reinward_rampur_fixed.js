require('dotenv').config();
const mongoose = require('mongoose');

// Import the schema to insert properly
const { StoreInwardEntry } = require('./src/modules/store/storeInwardEntry.schema');

async function processRampurInwardsFixed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const storeInwardEntriesRaw = db.collection('storeinwardentries');
  const purchaseInvoices = db.collection('purchaseinvoices');

  // 1. DELETE THE CORRUPT RAMPUR ENTRIES
  console.log(`Deleting existing/corrupt Rampur inward entries...`);
  await storeInwardEntriesRaw.deleteMany({ circle: { $regex: /^rampur$/i }, status: 'Pending Receipt' });

  // 2. FETCH PURCHASE INVOICES WITH RAMPUR ITEMS
  console.log(`Fetching Purchase Invoices with Rampur line items...`);
  const invoices = await purchaseInvoices.find({
    'lineItems.circle': { $regex: /^rampur$/i }
  }).toArray();

  const newInwardEntries = [];

  for (const invoice of invoices) {
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
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }]
      });
    }
  }

  console.log(`Preparing to insert ${newInwardEntries.length} new StoreInwardEntry documents for Rampur...`);

  if (newInwardEntries.length > 0) {
    // USE MONGOOSE MODEL TO ENSURE CORRECT TYPES (ObjectId casting, timestamps)
    const MongooseModel = mongoose.model('StoreInwardEntry');
    const insertResult = await MongooseModel.insertMany(newInwardEntries);
    console.log(`[FIXED] Successfully inserted ${insertResult.length} new Rampur inward entries using Mongoose.`);
  } else {
    console.log(`No Rampur line items found across the invoices!`);
  }

  process.exit(0);
}

processRampurInwardsFixed().catch(console.error);
