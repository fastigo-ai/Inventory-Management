import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

const normalizeCircle = (c: string) => {
  if (!c) return '';
  const t = c.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

const normalizePkg = (pkg: string) => {
  if (!pkg) return '';
  let n = pkg.trim().replace(/\s+\(/g, '(').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  n = n.replace(/^package\s+(\d+)\((.+)\)$/i, (_: string, num: string, inner: string) => `Package ${num}(${inner.toUpperCase()})`);
  return n;
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Step 1: Aggregate ALL invQty directly from PurchaseInvoices using MongoDB pipeline
    console.log('Aggregating actual invQty from all PurchaseInvoices...');
    const piAgg = await db.collection('purchaseinvoices').aggregate([
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: {
            itemId: '$lineItems.itemId',
            circle: '$lineItems.circle',
            package: '$lineItems.package',
          },
          totalQty: { $sum: { $toDouble: '$lineItems.quantity' } }
        }
      }
    ]).toArray();
    console.log(`Found ${piAgg.length} PI combos.`);

    // Step 2: Build bulk operations — one updateOne per combo
    const bulkOps: any[] = piAgg
      .filter(row => row._id.itemId)
      .map(row => ({
        updateOne: {
          filter: {
            itemId: row._id.itemId,
            circle: normalizeCircle(row._id.circle || ''),
            package: normalizePkg(row._id.package || ''),
          },
          update: { $set: { invQty: row.totalQty || 0 } },
          upsert: false  // only update existing rows, don't create new ones
        }
      }));

    // Step 3: First zero out all invQty
    console.log('Zeroing all invQty...');
    await db.collection('itemsummaries').updateMany({}, { $set: { invQty: 0 } });

    // Step 4: Bulk write all the correct values in ONE operation
    console.log(`Running bulk update for ${bulkOps.length} combos...`);
    if (bulkOps.length > 0) {
      const result = await db.collection('itemsummaries').bulkWrite(bulkOps, { ordered: false });
      console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    }

    console.log('Done! All invQty values now match actual Purchase Invoice data.');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
