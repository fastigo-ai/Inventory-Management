import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  console.log('--- Checking all itemsummaries in Rohru for any comparison anomalies ---');
  const items = await db.collection('itemsummaries').find({ circle: /rohru/i }).toArray();
  
  let piGtDi = 0;
  let billedGtDi = 0;
  let inwardGtDi = 0;
  for (const it of items) {
    if ((it.invQty || 0) > (it.diQty || 0)) {
      piGtDi++;
      console.log('invQty > diQty:', it.tempCode, it.itemName, 'DI:', it.diQty, 'INV:', it.invQty);
    }
    if ((it.billedQty || 0) > (it.diQty || 0)) {
      billedGtDi++;
      console.log('billedQty > diQty:', it.tempCode, it.itemName, 'DI:', it.diQty, 'Billed:', it.billedQty);
    }
  }
  console.log({ totalItems: items.length, piGtDi, billedGtDi });

  // Let's check raw DIs and PIs by tempCode across Rohru
  const rawDis = await db.collection('dis').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i } },
    { $group: {
      _id: '$lineItems.tempCode',
      name: { $first: '$lineItems.itemName' },
      totalDi: { $sum: '$lineItems.quantity' }
    }}
  ]).toArray();

  const rawPis = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i } },
    { $group: {
      _id: '$lineItems.tempCode',
      name: { $first: '$lineItems.itemName' },
      totalPi: { $sum: '$lineItems.quantity' }
    }}
  ]).toArray();

  console.log('\n--- Comparing raw DI total vs raw PI total by Temp Code in Rohru ---');
  for (const pi of rawPis) {
    const di = rawDis.find(d => d._id === pi._id);
    const diQty = di ? di.totalDi : 0;
    if (pi.totalPi > diQty) {
      console.log(`RAW PI > DI for TC ${pi._id} (${pi.name}): PI=${pi.totalPi}, DI=${diQty}`);
    }
  }

  // Also check if any PI in Rohru has DI number linked, or if PI was imported without DI
  const pisWithoutDi = await db.collection('purchaseinvoices').find({
    circle: /rohru/i,
    $or: [{ diNumber: { $exists: false } }, { diNumber: '' }, { diNumber: null }]
  }).toArray();
  console.log('\nPIs without diNumber in Rohru:', pisWithoutDi.length);

  await mongoose.disconnect();
}
check().catch(console.error);
