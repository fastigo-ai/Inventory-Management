const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log('--- Fetching data... ---');
  
  // Get all PIs
  const pis = await db.collection('purchaseinvoices').find({}).toArray();
  // Get all IRs
  const irs = await db.collection('storeinwardentries').find({}).toArray();
  
  console.log(`Loaded ${pis.length} PIs and ${irs.length} IRs.`);
  console.log('--- Analyzing Missing Pending IRs ---');

  // Group IRs by purchaseInvoiceId + (itemId || tempCode || itemName)
  const irSumMap = {};
  for (const ir of irs) {
    if (!ir.purchaseInvoiceId) continue;
    
    let keyPart = 'unknown';
    if (ir.itemId) keyPart = ir.itemId.toString();
    else if (ir.tempCode) keyPart = ir.tempCode;
    else if (ir.itemName) keyPart = ir.itemName;
    
    const key = `${ir.purchaseInvoiceId.toString()}_${keyPart}`;
    irSumMap[key] = (irSumMap[key] || 0) + (parseFloat(ir.invoiceQty) || 0);
  }

  let totalMissingEntries = 0;
  let totalMissingQuantity = 0;
  const missingDocsToInsert = [];

  for (const pi of pis) {
    if (!pi.lineItems || !Array.isArray(pi.lineItems)) continue;

    for (const item of pi.lineItems) {
      const piQty = item.totalInventory > 0 ? item.totalInventory : item.quantity;
      if (!piQty || piQty <= 0) continue;

      let keyPart = 'unknown';
      if (item.itemId) keyPart = item.itemId.toString();
      else if (item.tempCode) keyPart = item.tempCode;
      else if (item.itemName) keyPart = item.itemName;

      const key = `${pi._id.toString()}_${keyPart}`;
      const existingIrQty = irSumMap[key] || 0;

      const missingQty = piQty - existingIrQty;

      // Allow a tiny margin for float math precision issues
      if (missingQty > 0.1) {
        totalMissingEntries++;
        totalMissingQuantity += missingQty;
        
        missingDocsToInsert.push({
          purchaseInvoiceId: pi._id,
          purchaseOrderId: pi.purchaseOrderId,
          poNumber: pi.purchaseOrderNumber,
          poDate: item.poDate,
          billingFrom: pi.billingFrom || (pi.billingCompany && pi.billingCompany.name),
          vendorName: pi.vendorName,
          invoiceNumber: pi.invoiceNumber,
          invoiceDate: pi.date,
          diRefNo: pi.diNumber || pi.diNo,
          diId: item.diId || pi.diId,
          circle: item.circle || pi.circle,
          subcircle: item.subcircle,
          package: item.package,
          unit: item.unit,
          invoiceQty: missingQty,
          totalQty: missingQty,
          rate: item.rate,
          amount: missingQty * (item.rate || 0),
          tempCode: item.tempCode,
          itemId: item.itemId,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          hsnCode: item.hsnCode,
          cgst: item.cgst,
          sgst: item.sgst,
          igst: item.igst,
          taxableAmount: missingQty * (item.rate || 0),
          serialNumber: item.loaSerialNo,
          status: 'PENDING_RECEIPT',
          packingList: [{ packType: 'BOX', quantity: missingQty }],
          createdAt: new Date(),
          updatedAt: new Date(),
          _generatedByScript: true
        });
      }
    }
  }

  console.log(`Found ${totalMissingEntries} missing pending IR entries to generate.`);
  console.log(`Total missing quantity across all items: ${totalMissingQuantity.toLocaleString('en-IN')}`);

  if (process.argv.includes('--execute') && missingDocsToInsert.length > 0) {
    console.log(`Inserting ${missingDocsToInsert.length} documents into storeinwardentries...`);
    await db.collection('storeinwardentries').insertMany(missingDocsToInsert);
    console.log('Done!');
  } else {
    console.log('\nRun with --execute to actually insert them into the database.');
    if (missingDocsToInsert.length > 0) {
      console.log('Sample of what will be inserted:');
      console.log(missingDocsToInsert[0]);
    }
  }

  await mongoose.disconnect();
});
