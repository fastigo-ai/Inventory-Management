import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Fast bulk script to fix invQty (MRHOV) in ItemSummary by aggregating StoreInwardEntry directly.
 * This avoids the slow per-item rebuild loop and uses MongoDB aggregation instead.
 */
async function fixMrhovBulk() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // Step 1: Zero out all existing invQty in ItemSummary
  const zeroResult = await db.collection('itemsummaries').updateMany(
    { invQty: { $exists: true } },
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

  // Step 3: Apply each group's totalInvQty to matching ItemSummary
  let updatedCount = 0;
  let upsertedCount = 0;

  for (const group of inwardGroups) {
    const { itemId, circle, package: pkg } = group._id;
    const qty = group.totalInvQty;

    if (!itemId) continue;

    const circleNorm = String(circle || '').trim();
    const pkgNorm = String(pkg || '').trim();

    const result = await db.collection('itemsummaries').updateOne(
      {
        itemId: new mongoose.Types.ObjectId(itemId.toString()),
        circle: circleNorm,
        package: pkgNorm
      },
      { $set: { invQty: qty } }
    );

    if (result.matchedCount > 0) {
      updatedCount++;
    } else {
      // Summary row doesn't exist yet — try to find it with any circle/pkg match for this item
      const fallback = await db.collection('itemsummaries').findOne({
        itemId: new mongoose.Types.ObjectId(itemId.toString())
      });
      if (fallback) {
        // Apply to the first summary row for this item
        await db.collection('itemsummaries').updateOne(
          { _id: fallback._id },
          { $inc: { invQty: qty } }
        );
        updatedCount++;
      } else {
        // No summary exists at all for this item - this is fine, skip
        upsertedCount++;
      }
    }
  }

  console.log(`Updated invQty on ${updatedCount} ItemSummary records.`);
  if (upsertedCount > 0) {
    console.log(`Skipped ${upsertedCount} groups (no ItemSummary row found for those items).`);
  }

  // Step 4: Verify - show items with non-zero invQty
  const nonZero = await db.collection('itemsummaries').countDocuments({ invQty: { $gt: 0 } });
  console.log(`\n✅ Done! ${nonZero} ItemSummary rows now have invQty > 0.`);

  await mongoose.disconnect();
}

fixMrhovBulk().catch(console.error);
