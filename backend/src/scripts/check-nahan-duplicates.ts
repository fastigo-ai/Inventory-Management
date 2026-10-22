import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  console.log('--- Inspecting Nahan items for SR 4 (TC 34) and SR 5 (TC 1) in itemsummaries ---');
  const summaries4 = await db.collection('itemsummaries').find({
    circle: /nahan/i,
    loaSerialNo: '4'
  }).toArray();
  console.log(`Found ${summaries4.length} itemsummaries for Nahan loaSerialNo: '4':`);
  summaries4.forEach(s => {
    console.log({
      _id: s._id,
      itemId: s.itemId,
      itemName: s.itemName,
      tempCode: s.tempCode,
      loaSerialNo: s.loaSerialNo,
      circle: s.circle,
      package: s.package,
      diQty: s.diQty,
      invQty: s.invQty,
      issuedQty: s.issuedQty,
      loaQty: s.loaQty,
      bomQty: s.bomQty
    });
  });

  const summaries5 = await db.collection('itemsummaries').find({
    circle: /nahan/i,
    loaSerialNo: '5'
  }).toArray();
  console.log(`\nFound ${summaries5.length} itemsummaries for Nahan loaSerialNo: '5':`);
  summaries5.forEach(s => {
    console.log({
      _id: s._id,
      itemId: s.itemId,
      itemName: s.itemName,
      tempCode: s.tempCode,
      loaSerialNo: s.loaSerialNo,
      circle: s.circle,
      package: s.package,
      diQty: s.diQty,
      invQty: s.invQty,
      issuedQty: s.issuedQty,
      loaQty: s.loaQty,
      bomQty: s.bomQty
    });
  });

  // Check the corresponding items in items collection
  const itemIds = [...summaries4.map(s => s.itemId), ...summaries5.map(s => s.itemId)];
  const items = await db.collection('items').find({ _id: { $in: itemIds } }).toArray();
  console.log(`\nFound ${items.length} master items for these summaries:`);
  items.forEach(it => {
    console.log({
      _id: it._id,
      itemName: it.itemName,
      dynamicData: it.dynamicData
    });
  });

  await mongoose.disconnect();
}
check().catch(console.error);
