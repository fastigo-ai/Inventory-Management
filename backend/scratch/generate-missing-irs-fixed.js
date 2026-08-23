const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const pis = await db.collection('purchaseinvoices').find({}).toArray();
  const irs = await db.collection('storeinwardentries').find({}).toArray();

  // Group IRs by PI ID + Temp Code
  const irSumMap = {};
  for (const ir of irs) {
    if (!ir.purchaseInvoiceId || !ir.tempCode) continue;
    const key = `${ir.purchaseInvoiceId.toString()}_${ir.tempCode}`;
    irSumMap[key] = (irSumMap[key] || 0) + (parseFloat(ir.invoiceQty) || 0);
  }

  // Group PI quantities by PI ID + Temp Code
  const piSumMap = {};
  const piMetaMap = {}; // store first line item info to use for generating the missing IR
  for (const pi of pis) {
    if (!pi.lineItems) continue;
    for (const item of pi.lineItems) {
      if (!item.tempCode) continue;
      const key = `${pi._id.toString()}_${item.tempCode}`;
      const qty = item.totalInventory > 0 ? item.totalInventory : item.quantity;
      piSumMap[key] = (piSumMap[key] || 0) + qty;
      
      if (!piMetaMap[key]) {
        piMetaMap[key] = { pi, item };
      }
    }
  }

  let totalMissingQuantity = 0;
  const missingDocsToInsert = [];

  for (const key of Object.keys(piSumMap)) {
    const totalPiQty = piSumMap[key];
    const totalIrQty = irSumMap[key] || 0;
    
    const missingQty = totalPiQty - totalIrQty;
    
    if (missingQty > 0.1) {
      totalMissingQuantity += missingQty;
      const { pi, item } = piMetaMap[key];
      
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

  console.log(`Total missing quantity calculated correctly: ${totalMissingQuantity.toLocaleString('en-IN')}`);
  console.log(`Generating ${missingDocsToInsert.length} documents...`);

  if (process.argv.includes('--execute') && missingDocsToInsert.length > 0) {
    await db.collection('storeinwardentries').insertMany(missingDocsToInsert);
    console.log('Inserted!');
  } else {
    console.log('Run with --execute to insert.');
  }

  await mongoose.disconnect();
});
