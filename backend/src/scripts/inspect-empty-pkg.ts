import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const s1 = await db.collection('itemsummaries').findOne({ _id: new mongoose.Types.ObjectId('6ad9d50473e70f38ef5cbec2') });
  const s2 = await db.collection('itemsummaries').findOne({ _id: new mongoose.Types.ObjectId('6ad9d50173e70f38ef5cbdd5') });

  console.log('Record 1 (package: ""):', s1);
  console.log('\nRecord 2 (package: "Package 1(S/N)"):', s2);

  // Check how many itemsummaries have package: "" or null vs package: "Package 1(S/N)"
  const emptyPkgCount = await db.collection('itemsummaries').countDocuments({
    $or: [{ package: '' }, { package: null }, { package: { $exists: false } }]
  });
  const totalCount = await db.collection('itemsummaries').countDocuments();
  console.log(`\nItemsummaries with empty package: ${emptyPkgCount} / ${totalCount}`);

  // Group by circle and empty package
  const byCircle = await db.collection('itemsummaries').aggregate([
    { $group: {
      _id: { circle: '$circle', hasPkg: { $ne: ['$package', ''] } },
      count: { $sum: 1 }
    }}
  ]).toArray();
  console.log('\nBreakdown by circle and package presence:', byCircle);

  await mongoose.disconnect();
}
check().catch(console.error);
