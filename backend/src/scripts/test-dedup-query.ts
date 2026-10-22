import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testDedup() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  // Let's test the aggregation pipeline for Nahan with package Package 1(S/N)
  // Current grouping: { itemId: "$itemId", circle: "$circle", package: "$package" }
  const currentPipeline = [
    { $match: { circle: /^Nahan$/i } },
    { $group: {
      _id: { itemId: '$itemId', circle: '$circle', package: '$package' },
      count: { $sum: 1 }
    }}
  ];
  const currentResult = await db.collection('itemsummaries').aggregate(currentPipeline).toArray();
  console.log(`Current pipeline returns ${currentResult.length} rows for Nahan.`);

  // Deduped grouping: { itemId: "$itemId", circle: "$circle" }
  const dedupPipeline = [
    { $match: { circle: /^Nahan$/i } },
    { $group: {
      _id: { itemId: '$itemId', circle: '$circle' },
      count: { $sum: 1 }
    }}
  ];
  const dedupResult = await db.collection('itemsummaries').aggregate(dedupPipeline).toArray();
  console.log(`Deduped pipeline returns ${dedupResult.length} rows for Nahan.`);

  // Check how many items were duplicated in Nahan
  console.log(`Reduction in duplicate rows: ${currentResult.length - dedupResult.length} rows eliminated!`);

  // Let's check for Solan too
  const solanCurrent = await db.collection('itemsummaries').aggregate([
    { $match: { circle: /^Solan$/i } },
    { $group: { _id: { itemId: '$itemId', circle: '$circle', package: '$package' } } }
  ]).toArray();

  const solanDedup = await db.collection('itemsummaries').aggregate([
    { $match: { circle: /^Solan$/i } },
    { $group: { _id: { itemId: '$itemId', circle: '$circle' } } }
  ]).toArray();

  console.log(`Solan current rows: ${solanCurrent.length}, deduped rows: ${solanDedup.length} (eliminated ${solanCurrent.length - solanDedup.length} duplicate rows)`);

  await mongoose.disconnect();
}
testDedup().catch(console.error);
