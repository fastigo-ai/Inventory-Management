import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugLoa2026() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;

  // Check the specific itemId that has all the StoreInwardEntry records for LOA 2026
  const targetItemId = new mongoose.Types.ObjectId('6a8299025d7ee9d212355429');

  console.log('=== StoreInwardEntry for itemId 6a8299025d7ee9d212355429 ===');
  const inwards = await db.collection('storeinwardentries').find({ itemId: targetItemId }).toArray();
  console.log(`Total: ${inwards.length} records`);
  
  // Summarize by circle+package
  const grouped: Record<string, number> = {};
  for (const inv of inwards) {
    const key = `${inv.circle}|||${inv.package}`;
    const qty = Number(inv.invoiceQty || inv.acceptedQty || inv.totalQty || 0);
    grouped[key] = (grouped[key] || 0) + qty;
  }
  for (const [key, total] of Object.entries(grouped)) {
    const [circle, pkg] = key.split('|||');
    console.log(`  Circle: "${circle}" | Package: "${pkg}" | totalQty: ${total}`);
  }

  console.log('\n=== ItemSummary for itemId 6a8299025d7ee9d212355429 ===');
  const summaries = await db.collection('itemsummaries').find({ itemId: targetItemId }).toArray();
  for (const s of summaries) {
    console.log(`  _id: ${s._id} | itemName: "${s.itemName}" | Circle: "${s.circle}" | Package: "${s.package}" | loaQty: ${s.loaQty || 0} | diQty: ${s.diQty || 0} | invQty: ${s.invQty || 0} | loaSerialNo: "${s.loaSerialNo}"`);
  }

  // What does the bulk aggregation produce for this item?
  console.log('\n=== Aggregation result for this itemId ===');
  const agg = await db.collection('storeinwardentries').aggregate([
    { $match: { itemId: targetItemId } },
    {
      $group: {
        _id: { itemId: '$itemId', circle: '$circle', package: '$package' },
        totalInvQty: {
          $sum: {
            $ifNull: ['$invoiceQty', { $ifNull: ['$acceptedQty', { $ifNull: ['$totalQty', 0] }] }]
          }
        }
      }
    }
  ]).toArray();
  for (const r of agg) {
    console.log(`  Circle: "${r._id.circle}" | Package: "${r._id.package}" | totalInvQty: ${r.totalInvQty}`);
  }

  // Check why the update didn't work - simulate the update
  console.log('\n=== Simulating update for Rohru row ===');
  for (const r of agg) {
    const circleNorm = String(r._id.circle || '').trim();
    const pkgNorm = String(r._id.package || '').trim();
    const matchResult = await db.collection('itemsummaries').find({
      itemId: targetItemId,
      circle: circleNorm,
      package: pkgNorm
    }).toArray();
    console.log(`  Query: circle="${circleNorm}" pkg="${pkgNorm}" → matched ${matchResult.length} docs`);
    for (const m of matchResult) {
      console.log(`    _id: ${m._id} | current invQty: ${m.invQty} | loaSerialNo: "${m.loaSerialNo}"`);
    }
  }

  await mongoose.disconnect();
}

debugLoa2026().catch(console.error);
