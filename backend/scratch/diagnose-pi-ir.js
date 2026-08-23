/**
 * diagnose-pi-ir.js
 * Deep diagnosis of PI vs IR quantity discrepancies
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // 1. Check what fields PI uses for quantity
  const samplePI = await db.collection('purchaseinvoices').findOne(
    { 'lineItems.0': { $exists: true } },
    { projection: { invoiceNumber: 1, 'lineItems': { $slice: 1 } } }
  );
  const li = samplePI?.lineItems?.[0];
  console.log('=== SAMPLE PI LINE ITEM FIELDS ===');
  console.log('quantity:', li?.quantity);
  console.log('totalInventory:', li?.totalInventory);
  console.log('totalInvoiceQuantity:', li?.totalInvoiceQuantity);
  console.log('tempCode:', li?.tempCode);
  console.log('');

  // 2. Check what fields StoreInwardEntry uses
  const sampleIR = await db.collection('storeinwardentries').findOne(
    { status: { $nin: ['DRAFT', 'PENDING_RECEIPT'] } }
  );
  console.log('=== SAMPLE STORE INWARD ENTRY FIELDS ===');
  console.log('invoiceQty:', sampleIR?.invoiceQty);
  console.log('totalQty:', sampleIR?.totalQty);
  console.log('receivedQty:', sampleIR?.receivedQty);
  console.log('acceptedQty:', sampleIR?.acceptedQty);
  console.log('tempCode:', sampleIR?.tempCode);
  console.log('status:', sampleIR?.status);
  console.log('');

  // 3. For tempCode 101 specifically - compare PI qty vs IR qty using ALL possible fields
  const piFor101 = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.tempCode': '101' } },
    { $group: {
      _id: null,
      sumQuantity: { $sum: { $toDouble: '$lineItems.quantity' } },
      sumTotalInventory: { $sum: { $toDouble: { $ifNull: ['$lineItems.totalInventory', 0] } } },
      count: { $sum: 1 }
    }}
  ]).toArray();

  const irFor101 = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: '101', status: { $nin: ['DRAFT', 'PENDING_RECEIPT'] } } },
    { $group: {
      _id: null,
      sumInvoiceQty: { $sum: { $toDouble: { $ifNull: ['$invoiceQty', 0] } } },
      sumTotalQty: { $sum: { $toDouble: { $ifNull: ['$totalQty', 0] } } },
      sumAcceptedQty: { $sum: { $toDouble: { $ifNull: ['$acceptedQty', 0] } } },
      count: { $sum: 1 }
    }}
  ]).toArray();

  console.log('=== TEMPCODE 101 ANALYSIS ===');
  console.log('PI - sum(quantity):', piFor101[0]?.sumQuantity);
  console.log('PI - sum(totalInventory):', piFor101[0]?.sumTotalInventory);
  console.log('PI - line item count:', piFor101[0]?.count);
  console.log('');
  console.log('IR - sum(invoiceQty):', irFor101[0]?.sumInvoiceQty);
  console.log('IR - sum(totalQty):', irFor101[0]?.sumTotalQty);
  console.log('IR - sum(acceptedQty):', irFor101[0]?.sumAcceptedQty);
  console.log('IR - entry count:', irFor101[0]?.count);
  console.log('');

  // 4. Check PIs where totalInventory != quantity (the suspected mismatch)
  const mismatchedPIs = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: {
      'lineItems.tempCode': { $exists: true, $ne: '' },
      $expr: {
        $and: [
          { $gt: ['$lineItems.totalInventory', 0] },
          { $ne: ['$lineItems.totalInventory', '$lineItems.quantity'] }
        ]
      }
    }},
    { $project: {
      invoiceNumber: 1,
      tempCode: '$lineItems.tempCode',
      quantity: '$lineItems.quantity',
      totalInventory: '$lineItems.totalInventory'
    }},
    { $limit: 10 }
  ]).toArray();

  console.log('=== PIs WHERE totalInventory != quantity (sample) ===');
  mismatchedPIs.forEach(r => {
    console.log(`PI ${r.invoiceNumber} | tempCode ${r.tempCode}: quantity=${r.quantity}, totalInventory=${r.totalInventory}`);
  });
  console.log('');

  // 5. Overall: how many PIs use totalInventory vs quantity
  const totalWithInventory = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $group: {
      _id: null,
      withTotalInventory: { $sum: { $cond: [{ $gt: ['$lineItems.totalInventory', 0] }, 1, 0] } },
      withQuantityOnly: { $sum: { $cond: [{ $lte: [{ $ifNull: ['$lineItems.totalInventory', 0] }, 0] }, 1, 0] } },
      total: { $sum: 1 }
    }}
  ]).toArray();

  console.log('=== OVERALL FIELD USAGE ===');
  console.log('Line items with totalInventory > 0:', totalWithInventory[0]?.withTotalInventory);
  console.log('Line items with only quantity:', totalWithInventory[0]?.withQuantityOnly);
  console.log('Total line items:', totalWithInventory[0]?.total);

  await mongoose.disconnect();
});
