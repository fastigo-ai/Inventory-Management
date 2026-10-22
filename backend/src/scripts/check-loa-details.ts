import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const targetLoas = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

  console.log('--- Checking Rohru items with loaSerialNo 4 through 13 ---');
  for (const loa of targetLoas) {
    const item = await db.collection('items').findOne({
      'dynamicData.circle': /rohru/i,
      'dynamicData.loaSerialNo': loa
    });

    if (!item) {
      console.log(`LOA ${loa}: NOT FOUND in items`);
      continue;
    }

    const summary = await db.collection('itemsummaries').findOne({ itemId: item._id });

    // Check raw DIs and StoreInwards referencing this exact itemId
    const dis = await db.collection('dis').find({ 'lineItems.itemId': item._id }).toArray();
    const inwards = await db.collection('storeinwardentries').find({ itemId: item._id, status: { $ne: 'Voided' } }).toArray();
    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': item._id }).toArray();

    let diSum = 0;
    dis.forEach(d => d.lineItems.forEach((li: any) => { if (li.itemId?.toString() === item._id.toString()) diSum += (li.quantity || 0); }));
    let inwardSum = 0;
    inwards.forEach(i => inwardSum += Number(i.invoiceQty || i.acceptedQty || 0));
    let piSum = 0;
    pis.forEach(p => p.lineItems.forEach((li: any) => { if (li.itemId?.toString() === item._id.toString()) piSum += (li.quantity || 0); }));

    console.log(`LOA ${loa} (TC ${item.dynamicData?.tempCode}, ${summary?.itemName}):`);
    console.log(`  ItemSummary: DI=${summary?.diQty}, Inv=${summary?.invQty}, Billed=${summary?.billedQty}`);
    console.log(`  Raw for this ItemId (${item._id}): DIs=${dis.length} (sum=${diSum}), Inwards=${inwards.length} (sum=${inwardSum}), PIs=${pis.length} (sum=${piSum})`);

    // ALSO check if any raw DI or PI mentions this tempCode or itemName in Rohru, but with a DIFFERENT itemId!
    const otherDis = await db.collection('dis').aggregate([
      { $unwind: '$lineItems' },
      { $match: { 
        'lineItems.circle': /rohru/i, 
        $or: [
          { 'lineItems.tempCode': item.dynamicData?.tempCode },
          { 'lineItems.itemName': new RegExp('^' + (summary?.itemName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        ]
      } },
      { $group: {
        _id: '$lineItems.itemId',
        loaSerialNo: { $first: '$lineItems.loaSerialNo' },
        totalDi: { $sum: '$lineItems.quantity' }
      }}
    ]).toArray();

    const otherPis = await db.collection('purchaseinvoices').aggregate([
      { $unwind: '$lineItems' },
      { $match: { 
        'lineItems.circle': /rohru/i, 
        $or: [
          { 'lineItems.tempCode': item.dynamicData?.tempCode },
          { 'lineItems.itemName': new RegExp('^' + (summary?.itemName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        ]
      } },
      { $group: {
        _id: '$lineItems.itemId',
        loaSerialNo: { $first: '$lineItems.loaSerialNo' },
        totalPi: { $sum: '$lineItems.quantity' }
      }}
    ]).toArray();

    console.log(`  All Rohru DIs for this Temp Code/Name:`, otherDis);
    console.log(`  All Rohru PIs for this Temp Code/Name:`, otherPis);
    console.log('----------------------------------------------------');
  }

  await mongoose.disconnect();
}
check().catch(console.error);
