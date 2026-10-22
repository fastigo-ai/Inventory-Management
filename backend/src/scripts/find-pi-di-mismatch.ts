import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  
  const piGreaterDi = await db.collection('itemsummaries').find({
    circle: /rohru/i,
    $expr: { $gt: ['$invQty', '$diQty'] }
  }).toArray();
  
  console.log('Rohru items with invQty > diQty count:', piGreaterDi.length);
  piGreaterDi.forEach(s => {
    console.log({
      tempCode: s.tempCode,
      loaSerialNo: s.loaSerialNo,
      itemName: s.itemName,
      diQty: s.diQty,
      invQty: s.invQty,
      loaQty: s.loaQty
    });
  });

  const allPiGreaterDi = await db.collection('itemsummaries').find({
    $expr: { $gt: ['$invQty', '$diQty'] }
  }).toArray();
  console.log('Total items across all circles with invQty > diQty:', allPiGreaterDi.length);
  const byCircle: Record<string, number> = {};
  allPiGreaterDi.forEach(s => {
    byCircle[s.circle] = (byCircle[s.circle] || 0) + 1;
  });
  console.log('Breakdown by circle of invQty > diQty:', byCircle);

  // Also check items in Rohru where diQty === 0 and invQty === 0
  const zeroBoth = await db.collection('itemsummaries').countDocuments({
    circle: /rohru/i,
    diQty: 0,
    invQty: 0
  });
  const totalRohru = await db.collection('itemsummaries').countDocuments({
    circle: /rohru/i
  });
  console.log(`Rohru total itemsummaries: ${totalRohru}, with diQty=0 & invQty=0: ${zeroBoth}`);

  await mongoose.disconnect();
}
check().catch(console.error);
