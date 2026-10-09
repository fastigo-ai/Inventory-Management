/**
 * Fast targeted script: zeroes woQty on all ItemSummary records, then
 * aggregates woQty per (itemId, circle, package) from ContractorWorkOrder
 * and bulk-applies it using updateMany. Much faster than full rebuild.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const db = mongoose.connection.db!;
  const summaryColl = db.collection('itemsummaries');
  const woColl = db.collection('contractorworkorders');

  // Step 1: Zero out all existing woQty
  const zero = await summaryColl.updateMany({}, { $set: { woQty: 0 } });
  console.log(`Zeroed woQty on ${zero.modifiedCount} ItemSummary records.`);

  // Step 2: Aggregate woQty per (itemId, circle, package) from ContractorWorkOrder
  const groups = await woColl.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          itemId: '$items.itemId',
          circle: '$circle',
          package: '$package'
        },
        totalWoQty: { $sum: '$items.woQty' }
      }
    }
  ]).toArray();

  console.log(`Found ${groups.length} (item, circle, package) groups in Work Orders.`);

  // Step 3: Apply each group to matching ItemSummary rows
  let updated = 0;
  let skipped = 0;

  for (const g of groups) {
    if (!g._id.itemId || !g.totalWoQty) continue;

    // Normalize circle (Title Case) to match summary records
    const circ = g._id.circle
      ? g._id.circle.trim().charAt(0).toUpperCase() + g._id.circle.trim().slice(1).toLowerCase()
      : '';
    const pkg = g._id.package || '';

    const res = await summaryColl.updateMany(
      {
        itemId: g._id.itemId,
        circle: circ,
        package: pkg
      },
      { $set: { woQty: g.totalWoQty } }
    );

    if (res.matchedCount > 0) {
      updated++;
    } else {
      // Try matching just by itemId if circle/package combo not found
      const fallback = await summaryColl.updateMany(
        { itemId: g._id.itemId },
        { $set: { woQty: g.totalWoQty } }
      );
      if (fallback.matchedCount > 0) updated++;
      else skipped++;
    }
  }

  console.log(`Updated ${updated} groups, skipped ${skipped} (no matching summary row).`);

  const nonZero = await summaryColl.countDocuments({ woQty: { $gt: 0 } });
  console.log(`\n✅ Done! ${nonZero} ItemSummary rows now have woQty > 0.`);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
