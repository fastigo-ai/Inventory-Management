import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Fixed bulk script:
 * - Handles duplicate ItemSummary rows (same itemId+circle+package) by updating ALL matching docs
 * - Uses updateMany instead of updateOne per group
 */
async function fixMrhovFinal() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // Step 1: Zero out all existing invQty in ItemSummary
  const zeroResult = await db.collection('itemsummaries').updateMany(
    {},
    { $set: { invQty: 0 } }
  );
  console.log(`Zeroed invQty on ${zeroResult.modifiedCount} ItemSummary records.`);

  // Step 2: Aggregate StoreInwardEntry → group by itemId + circle + package
  const pipeline = [
    {
      $group: {
        _id: {
          itemId: '$itemId',
          circle: '$circle',
          package: '$package'
        },
        totalInvQty: {
          $sum: {
            $ifNull: [
              '$invoiceQty',
              { $ifNull: ['$acceptedQty', { $ifNull: ['$totalQty', 0] }] }
            ]
          }
        }
      }
    },
    { $match: { totalInvQty: { $gt: 0 } } }
  ];

  const inwardGroups = await db.collection('storeinwardentries').aggregate(pipeline).toArray();
  console.log(`Found ${inwardGroups.length} unique (itemId × circle × package) groups from StoreInwardEntry.`);

  // Step 3: Apply each group using updateMany (handles duplicate summary rows)
  let updatedGroups = 0;
  let totalDocsUpdated = 0;
  let skippedGroups = 0;

  for (const group of inwardGroups) {
    const { itemId, circle, package: pkg } = group._id;
    const qty = group.totalInvQty;

    if (!itemId) continue;

    const circleNorm = String(circle || '').trim();
    const pkgNorm = String(pkg || '').trim();

    // Use updateMany so ALL duplicate rows get the correct invQty
    const result = await db.collection('itemsummaries').updateMany(
      {
        itemId: new mongoose.Types.ObjectId(itemId.toString()),
        circle: circleNorm,
        package: pkgNorm
      },
      { $set: { invQty: qty } }
    );

    if (result.matchedCount > 0) {
      updatedGroups++;
      totalDocsUpdated += result.modifiedCount;
    } else {
      // No exact circle+package match — try to find any summary for this item and increment
      const fallback = await db.collection('itemsummaries').findOne({
        itemId: new mongoose.Types.ObjectId(itemId.toString())
      });
      if (fallback) {
        await db.collection('itemsummaries').updateMany(
          { itemId: new mongoose.Types.ObjectId(itemId.toString()) },
          { $inc: { invQty: qty } }
        );
        updatedGroups++;
      } else {
        skippedGroups++;
      }
    }
  }

  console.log(`Updated ${updatedGroups} groups → ${totalDocsUpdated} ItemSummary docs modified.`);
  if (skippedGroups > 0) {
    console.log(`Skipped ${skippedGroups} groups (no ItemSummary row found).`);
  }

  // Step 4: Verify LOA 2026 specifically
  console.log('\n=== Verification: STP 9 MTR LOA 2026 ===');
  const loa2026 = await db.collection('itemsummaries').find({ loaSerialNo: '2026' }).toArray();
  for (const s of loa2026) {
    console.log(`  Circle: "${s.circle}" | Package: "${s.package}" | loaQty: ${s.loaQty || 0} | diQty: ${s.diQty || 0} | invQty(MRHOV): ${s.invQty || 0}`);
  }

  // Step 5: Overall stats
  const nonZero = await db.collection('itemsummaries').countDocuments({ invQty: { $gt: 0 } });
  console.log(`\n✅ Done! ${nonZero} ItemSummary rows now have invQty > 0.`);

  await mongoose.disconnect();
}

fixMrhovFinal().catch(console.error);
