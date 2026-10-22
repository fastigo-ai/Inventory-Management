import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  console.log('--- 1. Check Rohru items where invQty > diQty in ItemSummary ---');
  const piGreaterDi = await db.collection('itemsummaries').find({
    circle: /rohru/i,
    $expr: { $gt: ['$invQty', '$diQty'] }
  }).toArray();

  console.log(`Found ${piGreaterDi.length} items where invQty > diQty in Rohru:`);
  for (const s of piGreaterDi.slice(0, 15)) {
    console.log({
      tempCode: s.tempCode,
      loaSerialNo: s.loaSerialNo,
      itemName: s.itemName,
      diQty: s.diQty,
      invQty: s.invQty,
      loaQty: s.loaQty
    });
  }

  console.log('\n--- 2. Check Raw DIs vs Raw PIs in Rohru ---');
  // Aggregate raw DIs by tempCode or itemName in Rohru
  const rawDis = await db.collection('dis').aggregate([
    { $match: { $or: [{ circle: /rohru/i }, { 'lineItems.circle': /rohru/i }] } },
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i } },
    { $group: {
      _id: { tempCode: '$lineItems.tempCode', name: '$lineItems.itemName' },
      totalDiQty: { $sum: '$lineItems.quantity' }
    }}
  ]).toArray();

  // Aggregate raw PIs by tempCode or itemName in Rohru
  const rawPis = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i } },
    { $group: {
      _id: { tempCode: '$lineItems.tempCode', name: '$lineItems.itemName' },
      totalPiQty: { $sum: '$lineItems.quantity' },
      totalInvoiceQty: { $sum: '$lineItems.invoiceQuantity' }
    }}
  ]).toArray();

  console.log(`Raw distinct items in DIs: ${rawDis.length}`);
  console.log(`Raw distinct items in PIs: ${rawPis.length}`);

  // Check top items
  console.log('\nCheck top 10 items in raw PIs:');
  for (const p of rawPis.slice(0, 10)) {
    const matchingDi = rawDis.find(d => 
      (d._id.tempCode && d._id.tempCode === p._id.tempCode) || 
      (d._id.name && d._id.name.toLowerCase() === (p._id.name || '').toLowerCase())
    );
    console.log({
      tempCode: p._id.tempCode,
      name: p._id.name,
      piQty: p.totalPiQty || p.totalInvoiceQty,
      diQty: matchingDi?.totalDiQty || 0,
      isPiGreater: (p.totalPiQty || p.totalInvoiceQty) > (matchingDi?.totalDiQty || 0)
    });
  }

  // Also check Temp Code 1 (STP 9 MTR) and Temp Code 34 (LT AB CABLE) specifically!
  console.log('\n--- 3. Check STP 9 MTR (Temp Code 1) and LT AB CABLE (Temp Code 34) in Rohru ---');
  for (const tc of ['1', '34']) {
    const diTc = await db.collection('dis').aggregate([
      { $unwind: '$lineItems' },
      { $match: { 'lineItems.circle': /rohru/i, 'lineItems.tempCode': tc } },
      { $project: { diNumber: 1, circle: 1, 'lineItems.quantity': 1, 'lineItems.itemName': 1, 'lineItems.circle': 1 } }
    ]).toArray();

    const piTc = await db.collection('purchaseinvoices').aggregate([
      { $unwind: '$lineItems' },
      { $match: { 'lineItems.circle': /rohru/i, 'lineItems.tempCode': tc } },
      { $project: { invoiceNumber: 1, circle: 1, 'lineItems.quantity': 1, 'lineItems.invoiceQuantity': 1, 'lineItems.itemName': 1, 'lineItems.circle': 1 } }
    ]).toArray();

    console.log(`TC ${tc} Raw DIs in Rohru:`, diTc);
    console.log(`TC ${tc} Raw PIs in Rohru:`, piTc);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
