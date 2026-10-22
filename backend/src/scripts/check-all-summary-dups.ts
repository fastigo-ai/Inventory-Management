import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkDuplicates() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const duplicates = await db.collection('itemsummaries').aggregate([
    {
      $group: {
        _id: { itemId: '$itemId', circle: '$circle' },
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', package: '$package', diQty: '$diQty', invQty: '$invQty', transferOutQty: '$transferOutQty' } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`Found ${duplicates.length} (itemId × circle) pairs with >1 ItemSummary doc:`);
  
  const byCircle: Record<string, number> = {};
  for (const d of duplicates) {
    const c = d._id.circle || 'Unknown';
    byCircle[c] = (byCircle[c] || 0) + 1;
  }
  console.log('Duplicate counts by circle:', byCircle);

  console.log('\nSample duplicate pairs:');
  duplicates.slice(0, 5).forEach(d => {
    console.log(`Circle: ${d._id.circle}, ItemId: ${d._id.itemId}, Docs count: ${d.count}`);
    console.log(d.docs);
  });

  await mongoose.disconnect();
}
checkDuplicates().catch(console.error);
