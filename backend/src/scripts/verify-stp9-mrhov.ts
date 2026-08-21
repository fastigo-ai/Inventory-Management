import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyStp9Mrhov() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;

  // Find all master items where name contains 'STP 9' or '9 MTR'
  const masterItems = await db.collection('items').find({
    $or: [
      { 'dynamicData.name': { $regex: 'STP.*9.*MTR', $options: 'i' } },
      { 'dynamicData.name': { $regex: '9.*MTR.*STP', $options: 'i' } },
    ]
  }).toArray();

  console.log(`\n=== Master Items matching "STP 9 MTR" (${masterItems.length} found) ===`);
  for (const item of masterItems) {
    const d = item.dynamicData || {};
    console.log(`\nItem: ${d.name}`);
    console.log(`  _id       : ${item._id}`);
    console.log(`  LOA Serial: ${d.sku || d.loaSerialNo || 'N/A'}`);
    console.log(`  Circle    : ${d.circle || 'N/A'}`);
    console.log(`  Package   : ${d.package || 'N/A'}`);
    console.log(`  TempCode  : ${d.tempCode || 'N/A'}`);

    // Get its ItemSummary rows
    const summaries = await db.collection('itemsummaries').find({
      itemId: new mongoose.Types.ObjectId(item._id.toString())
    }).toArray();

    if (summaries.length === 0) {
      console.log(`  ❌ No ItemSummary rows found!`);
    } else {
      console.log(`  ItemSummary rows (${summaries.length}):`);
      for (const s of summaries) {
        console.log(`    Circle: "${s.circle}" | Package: "${s.package}" | loaQty: ${s.loaQty || 0} | diQty: ${s.diQty || 0} | invQty(MRHOV): ${s.invQty || 0}`);
      }
    }

    // Also check StoreInwardEntry records for this item
    const inwards = await db.collection('storeinwardentries').find({
      itemId: new mongoose.Types.ObjectId(item._id.toString())
    }).toArray();
    console.log(`  StoreInwardEntry records (${inwards.length}):`);
    for (const inv of inwards) {
      const qty = inv.invoiceQty || inv.acceptedQty || inv.totalQty || 0;
      console.log(`    Circle: "${inv.circle}" | Package: "${inv.package}" | invoiceQty: ${qty} | serialNumber: "${inv.serialNumber}"`);
    }
  }

  // Also check by LOA serial "2026" specifically
  console.log('\n=== StoreInwardEntries with serialNumber "2026" ===');
  const loa2026Inwards = await db.collection('storeinwardentries').find({
    serialNumber: '2026'
  }).toArray();
  console.log(`Found ${loa2026Inwards.length} StoreInwardEntry records with serialNumber = "2026"`);
  for (const inv of loa2026Inwards) {
    const qty = inv.invoiceQty || inv.acceptedQty || inv.totalQty || 0;
    console.log(`  itemId: ${inv.itemId} | Circle: "${inv.circle}" | Package: "${inv.package}" | qty: ${qty} | itemName: "${inv.itemName}"`);
  }

  // Check ItemSummary for LOA 2026 items
  console.log('\n=== ItemSummary rows with loaSerialNo "2026" ===');
  const loa2026Summaries = await db.collection('itemsummaries').find({
    loaSerialNo: '2026'
  }).toArray();
  console.log(`Found ${loa2026Summaries.length} ItemSummary rows`);
  for (const s of loa2026Summaries) {
    console.log(`  itemName: "${s.itemName}" | Circle: "${s.circle}" | Package: "${s.package}" | loaQty: ${s.loaQty || 0} | diQty: ${s.diQty || 0} | invQty(MRHOV): ${s.invQty || 0}`);
  }

  await mongoose.disconnect();
}

verifyStp9Mrhov().catch(console.error);
