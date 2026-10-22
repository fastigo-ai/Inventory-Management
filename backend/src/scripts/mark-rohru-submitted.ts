/**
 * One-time migration: Mark all JMC, WIP (Consume), and WIP Required
 * records for Rohru circle as 'Submitted'.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/mark-rohru-submitted.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment');
  process.exit(1);
}

// Rohru circle regex — matches "Rohru", "ROHRU", "rohru" etc.
const ROHRU_REGEX = /^rohru$/i;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;

  const collections = [
    { name: 'jmcregisters',         label: 'JMC' },
    { name: 'wipregisters',         label: 'WIP (Consume)' },
    { name: 'wiprequiredregisters', label: 'WIP Required' },
  ];

  for (const col of collections) {
    const collection = db.collection(col.name);

    // Count records that will be updated
    const total = await collection.countDocuments({
      circle: { $regex: ROHRU_REGEX },
      status: { $ne: 'Submitted' }
    });

    if (total === 0) {
      console.log(`ℹ️  ${col.label}: No non-Submitted records found for Rohru — skipping.`);
      continue;
    }

    // Show breakdown by current status before update
    const breakdown = await collection.aggregate([
      { $match: { circle: { $regex: ROHRU_REGEX }, status: { $ne: 'Submitted' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log(`\n📋 ${col.label} — ${total} records to update (Rohru, non-Submitted):`);
    breakdown.forEach((b: any) => console.log(`   • ${b._id || 'null'}: ${b.count}`));

    const result = await collection.updateMany(
      {
        circle: { $regex: ROHRU_REGEX },
        status: { $ne: 'Submitted' }
      },
      {
        $set: { status: 'Submitted', updatedAt: new Date() }
      }
    );

    console.log(`✅ ${col.label}: Updated ${result.modifiedCount} records → Submitted`);
  }

  console.log('\n🎉 Done. All Rohru records are now Submitted.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
