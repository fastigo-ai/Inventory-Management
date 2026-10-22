import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const prCount = await db.collection('prs').countDocuments();
  const inwardCount = await db.collection('storeinwardentries').countDocuments();
  const piCount = await db.collection('purchaseinvoices').countDocuments();

  console.log({ prCount, inwardCount, piCount });

  // Sample PR
  const samplePr = await db.collection('prs').findOne();
  console.log('Sample PR:', samplePr ? { _id: samplePr._id, invoiceNo: samplePr.invoiceNo, circle: samplePr.circle, lineItemsCount: samplePr.lineItems?.length } : null);

  // Sample PI
  const samplePi = await db.collection('purchaseinvoices').findOne();
  console.log('Sample PI:', samplePi ? { _id: samplePi._id, invoiceNumber: samplePi.invoiceNumber, circle: samplePi.circle, lineItemsCount: samplePi.lineItems?.length } : null);

  // Check 292 Solan items where invQty > diQty
  const solanMismatch = await db.collection('itemsummaries').find({
    circle: /solan/i,
    $expr: { $gt: ['$invQty', '$diQty'] }
  }).limit(5).toArray();
  console.log('\nSample Solan items with invQty > diQty:');
  for (const s of solanMismatch) {
    console.log({
      itemId: s.itemId,
      itemName: s.itemName,
      diQty: s.diQty,
      invQty: s.invQty,
      loaQty: s.loaQty
    });

    // Check where invQty came from for this itemId
    const prs = await db.collection('prs').find({ 'lineItems.itemId': s.itemId }).toArray();
    const inwards = await db.collection('storeinwardentries').find({ itemId: s.itemId }).toArray();
    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': s.itemId }).toArray();
    const dis = await db.collection('dis').find({ 'lineItems.itemId': s.itemId }).toArray();

    console.log(`  Source counts: PRs=${prs.length}, StoreInwards=${inwards.length}, PIs=${pis.length}, DIs=${dis.length}`);
    let prInvSum = 0;
    prs.forEach(p => p.lineItems?.forEach((li: any) => { if (li.itemId?.toString() === s.itemId.toString()) prInvSum += (li.invoiceQuantity || 0); }));
    let inwardInvSum = 0;
    inwards.forEach(i => inwardInvSum += Number(i.invoiceQty || i.acceptedQty || 0));
    let diSum = 0;
    dis.forEach(d => d.lineItems?.forEach((li: any) => { if (li.itemId?.toString() === s.itemId.toString()) diSum += (li.quantity || 0); }));
    console.log(`  Sums: prInvSum=${prInvSum}, inwardInvSum=${inwardInvSum}, diSum=${diSum}, storedInvQty=${s.invQty}`);
  }

  await mongoose.disconnect();
}
check().catch(console.error);
