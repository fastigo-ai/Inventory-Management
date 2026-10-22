import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const items34 = await db.collection('items').find({
    'dynamicData.circle': /rohru/i,
    $or: [
      { 'dynamicData.tempCode': '34' },
      { 'dynamicData.tempCode': 34 },
      { itemName: /LT AB CABLE/i }
    ]
  }).toArray();

  console.log(`Found ${items34.length} items for Rohru TC 34 / LT AB CABLE:`);
  for (const it of items34) {
    const summary = await db.collection('itemsummaries').findOne({ itemId: it._id });
    console.log({
      _id: it._id,
      itemName: it.itemName,
      loaSerialNo: it.dynamicData?.loaSerialNo,
      circle: it.dynamicData?.circle,
      loaQty: it.dynamicData?.loaQuantity,
      bomQty: it.dynamicData?.bomQuantity,
      summary: summary ? {
        diQty: summary.diQty,
        invQty: summary.invQty,
        billedQty: summary.billedQty,
        loaQty: summary.loaQty,
        bomQty: summary.bomQty
      } : 'NO_SUMMARY'
    });
  }

  // Also check DIs and PIs line items for LT AB CABLE in Rohru to see what itemId or loaSerialNo they reference
  const dis = await db.collection('dis').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i, 'lineItems.itemName': /LT AB CABLE/i } }
  ]).toArray();
  console.log('\nDI line items for LT AB CABLE in Rohru:');
  dis.forEach(d => console.log({
    diNumber: d.diNumber,
    itemId: d.lineItems.itemId,
    loaSerialNo: d.lineItems.loaSerialNo,
    quantity: d.lineItems.quantity
  }));

  const pis = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /rohru/i, 'lineItems.itemName': /LT AB CABLE/i } }
  ]).toArray();
  console.log('\nPI line items for LT AB CABLE in Rohru:');
  pis.forEach(p => console.log({
    invoiceNumber: p.invoiceNumber,
    itemId: p.lineItems.itemId,
    loaSerialNo: p.lineItems.loaSerialNo,
    quantity: p.lineItems.quantity
  }));

  await mongoose.disconnect();
}
check().catch(console.error);
