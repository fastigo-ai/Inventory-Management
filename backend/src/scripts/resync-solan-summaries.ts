import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function resyncSolanSummaries() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // 1. Inward quantities per itemId
  console.log('Aggregating StoreInwardEntry for Solan...');
  const inwardAgg = await db.collection('storeinwardentries').aggregate([
    { $match: { circle: /solan/i, status: { $ne: 'Voided' } } },
    { $group: {
        _id: '$itemId',
        totalInward: { $sum: { $ifNull: ['$invoiceQty', { $ifNull: ['$acceptedQty', { $ifNull: ['$totalQty', 0] }] }] } }
    }}
  ]).toArray();
  const inwardMap = new Map<string, number>();
  inwardAgg.forEach(r => {
    if (r._id) inwardMap.set(r._id.toString(), r.totalInward);
  });
  console.log(`Found inward data for ${inwardMap.size} itemIds in Solan.`);

  // 2. Purchase Invoice quantities per itemId
  console.log('Aggregating PurchaseInvoices for Solan...');
  const piAgg = await db.collection('purchaseinvoices').aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.circle': /solan/i } },
    { $group: {
        _id: '$lineItems.itemId',
        totalPi: { $sum: { $toDouble: '$lineItems.quantity' } }
    }}
  ]).toArray();
  const piMap = new Map<string, number>();
  piAgg.forEach(r => {
    if (r._id) piMap.set(r._id.toString(), r.totalPi);
  });
  console.log(`Found PI data for ${piMap.size} itemIds in Solan.`);

  // 3. Update all Solan itemsummaries
  const solanSummaries = await db.collection('itemsummaries').find({ circle: /solan/i }).toArray();
  console.log(`Updating ${solanSummaries.length} ItemSummary documents for Solan...`);

  const bulkOps = solanSummaries.map(s => {
    const id = s.itemId?.toString();
    const invQty = inwardMap.has(id) ? (inwardMap.get(id) || 0) : (piMap.get(id) || 0);
    const billedQty = piMap.has(id) ? (piMap.get(id) || 0) : invQty;

    return {
      updateOne: {
        filter: { _id: s._id },
        update: {
          $set: {
            invQty,
            billedQty
          }
        }
      }
    };
  });

  if (bulkOps.length > 0) {
    const res = await db.collection('itemsummaries').bulkWrite(bulkOps);
    console.log(`Bulk write completed: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  }

  // 4. Verify new totals
  const updatedSummaries = await db.collection('itemsummaries').find({ circle: /solan/i }).toArray();
  const newTotalInv = updatedSummaries.reduce((a, s) => a + (s.invQty || 0), 0);
  const newTotalBilled = updatedSummaries.reduce((a, s) => a + (s.billedQty || 0), 0);

  console.log(`\nVerification:`);
  console.log(`New Solan invQty total:    ${newTotalInv.toFixed(3)}`);
  console.log(`New Solan billedQty total: ${newTotalBilled.toFixed(3)}`);

  await mongoose.disconnect();
  console.log('Done!');
}

resyncSolanSummaries().catch(console.error);
