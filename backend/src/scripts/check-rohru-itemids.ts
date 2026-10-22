import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  // 1. Check all Rohru items in `items` collection
  const rohruItems = await db.collection('items').find({
    'dynamicData.circle': /rohru/i,
    isDeleted: { $ne: true }
  }).toArray();
  console.log(`Total Rohru items in items collection: ${rohruItems.length}`);

  // 2. Check all DIs that mention Rohru
  const rohruDIs = await db.collection('dis').find({
    $or: [
      { circle: /rohru/i },
      { 'lineItems.circle': /rohru/i }
    ]
  }).toArray();
  console.log(`Total DIs mentioning Rohru: ${rohruDIs.length}`);

  let diLinesWithItemId = 0;
  let diLinesWithoutItemId = 0;
  const missingDiItemIds: any[] = [];
  for (const di of rohruDIs) {
    for (const li of di.lineItems) {
      if ((li.circle || di.circle || '').toLowerCase().includes('rohru')) {
        if (li.itemId) {
          diLinesWithItemId++;
        } else {
          diLinesWithoutItemId++;
          missingDiItemIds.push({ diNumber: di.diNumber, tempCode: li.tempCode, itemName: li.itemName, loaSerialNo: li.loaSerialNo });
        }
      }
    }
  }
  console.log(`DI line items in Rohru: with itemId=${diLinesWithItemId}, without itemId=${diLinesWithoutItemId}`);
  if (missingDiItemIds.length > 0) {
    console.log('Sample missing itemId in DIs:', missingDiItemIds.slice(0, 5));
  }

  // 3. Check all PIs that mention Rohru
  const rohruPIs = await db.collection('purchaseinvoices').find({
    $or: [
      { circle: /rohru/i },
      { 'lineItems.circle': /rohru/i }
    ]
  }).toArray();
  console.log(`Total PIs mentioning Rohru: ${rohruPIs.length}`);

  let piLinesWithItemId = 0;
  let piLinesWithoutItemId = 0;
  const missingPiItemIds: any[] = [];
  for (const pi of rohruPIs) {
    for (const li of pi.lineItems) {
      if ((li.circle || pi.circle || '').toLowerCase().includes('rohru')) {
        if (li.itemId) {
          piLinesWithItemId++;
        } else {
          piLinesWithoutItemId++;
          missingPiItemIds.push({ invoiceNumber: pi.invoiceNumber, tempCode: li.tempCode, itemName: li.itemName, loaSerialNo: li.loaSerialNo });
        }
      }
    }
  }
  console.log(`PI line items in Rohru: with itemId=${piLinesWithItemId}, without itemId=${piLinesWithoutItemId}`);
  if (missingPiItemIds.length > 0) {
    console.log('Sample missing itemId in PIs:', missingPiItemIds.slice(0, 5));
  }

  // 4. Check how many Rohru items in `itemsummaries` have diQty > 0 or invQty > 0
  const rohruSummaries = await db.collection('itemsummaries').find({ circle: /rohru/i }).toArray();
  const withDi = rohruSummaries.filter(s => (s.diQty || 0) > 0);
  const withInv = rohruSummaries.filter(s => (s.invQty || 0) > 0);
  console.log(`ItemSummaries in Rohru (${rohruSummaries.length}): with diQty>0: ${withDi.length}, with invQty>0: ${withInv.length}`);

  await mongoose.disconnect();
}
check().catch(console.error);
