import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function quickCheck() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;

  // 1. Sample 5 StoreInwardEntry records to see what fields they have
  console.log('=== 5 Sample StoreInwardEntry records ===');
  const samples = await db.collection('storeinwardentries').find({}).limit(5).toArray();
  for (const s of samples) {
    console.log(JSON.stringify({
      _id: s._id,
      itemId: s.itemId,
      itemName: s.itemName,
      circle: s.circle,
      package: s.package,
      serialNumber: s.serialNumber,
      loaSerialNo: s.loaSerialNo,
      invoiceQty: s.invoiceQty,
      acceptedQty: s.acceptedQty,
      totalQty: s.totalQty
    }, null, 2));
  }

  // 2. How many StoreInwardEntry records have a valid itemId (not null/undefined)?
  const withItemId = await db.collection('storeinwardentries').countDocuments({ itemId: { $exists: true, $ne: null } });
  const total = await db.collection('storeinwardentries').countDocuments({});
  console.log(`\nTotal inwards: ${total} | With itemId: ${withItemId} | Without: ${total - withItemId}`);

  // 3. Check if item 6a8299025d7ee9d212355429 is in the items collection and not deleted
  const item = await db.collection('items').findOne({ _id: new mongoose.Types.ObjectId('6a8299025d7ee9d212355429') });
  if (item) {
    console.log(`\nItem 6a8299025d7ee9d212355429:`);
    console.log(`  name: ${item.dynamicData?.name}`);
    console.log(`  circle: ${item.dynamicData?.circle}`);
    console.log(`  loaSerialNo: ${item.dynamicData?.loaSerialNo || item.dynamicData?.sku}`);
    console.log(`  isDeleted: ${item.isDeleted}`);
  } else {
    console.log(`\n❌ Item 6a8299025d7ee9d212355429 NOT FOUND in items collection!`);
  }

  // 4. Check specifically how many STP 9 MTR inwards point to this itemId
  const stp9Inwards = await db.collection('storeinwardentries').find({ 
    itemId: new mongoose.Types.ObjectId('6a8299025d7ee9d212355429')
  }).limit(3).toArray();
  console.log(`\n=== 3 STP 9 MTR Rohru LOA 2026 inward records ===`);
  for (const s of stp9Inwards) {
    console.log(JSON.stringify({
      _id: s._id,
      itemId: s.itemId?.toString(),
      itemName: s.itemName,
      circle: s.circle,
      serialNumber: s.serialNumber,
      invoiceQty: s.invoiceQty
    }));
  }

  await mongoose.disconnect();
}

quickCheck().catch(console.error);
