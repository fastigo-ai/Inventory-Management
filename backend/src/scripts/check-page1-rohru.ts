import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function checkAndRebuildRohru() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  // 1. Get all items belonging to Rohru
  const rohruItems = await db.collection('items').find({
    'dynamicData.circle': /rohru/i,
    isDeleted: { $ne: true }
  }).sort({ 'dynamicData.loaSerialNo': 1 }).toArray();

  console.log(`Total Rohru items in items master: ${rohruItems.length}`);

  // Let's check page 1 items (first 15 items by loaSerialNo)
  const page1Items = rohruItems.slice(0, 15);
  console.log('\n--- Page 1 Items (first 15 by loaSerialNo) BEFORE rebuild ---');
  for (const it of page1Items) {
    const s = await db.collection('itemsummaries').findOne({ itemId: it._id });
    console.log({
      loaSerialNo: it.dynamicData?.loaSerialNo,
      tempCode: it.dynamicData?.tempCode,
      itemName: it.itemName || s?.itemName,
      loaQty: s?.loaQty,
      bomQty: s?.bomQty,
      diQty: s?.diQty,
      invQty: s?.invQty
    });
  }

  // Check how many raw DIs and StoreInwards exist for page 1 items
  console.log('\n--- Checking raw documents for page 1 items ---');
  for (const it of page1Items) {
    const dis = await db.collection('dis').find({ 'lineItems.itemId': it._id }).toArray();
    const inwards = await db.collection('storeinwardentries').find({ itemId: it._id, status: { $ne: 'Voided' } }).toArray();
    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': it._id }).toArray();
    let diSum = 0;
    dis.forEach(d => d.lineItems.forEach((li: any) => { if (li.itemId?.toString() === it._id.toString()) diSum += (li.quantity || 0); }));
    let inwardSum = 0;
    inwards.forEach(i => inwardSum += Number(i.invoiceQty || i.acceptedQty || 0));
    let piSum = 0;
    pis.forEach(p => p.lineItems.forEach((li: any) => { if (li.itemId?.toString() === it._id.toString()) piSum += (li.quantity || 0); }));

    console.log(`LOA ${it.dynamicData?.loaSerialNo} (TC ${it.dynamicData?.tempCode}): raw DIs=${dis.length} (sum=${diSum}), raw Inwards=${inwards.length} (sum=${inwardSum}), raw PIs=${pis.length} (sum=${piSum})`);
  }

  await mongoose.disconnect();
}
checkAndRebuildRohru().catch(console.error);
