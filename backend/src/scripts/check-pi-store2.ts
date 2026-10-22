import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const col = db.collection('storeinwardentries');

  // Let's find entries matching store = Nalagarh or circle = Solan
  const queryAll = {
    $or: [
      { circle: /solan/i },
      { subcircle: /solan/i },
      { billingFrom: /solan/i },
      { store: /solan/i },
      { circle: /nalagarh/i },
      { subcircle: /nalagarh/i },
      { billingFrom: /nalagarh/i },
      { store: /nalagarh/i }
    ]
  };

  const allCount = await col.countDocuments(queryAll);
  const withoutVoided = await col.countDocuments({ ...queryAll, status: { $ne: 'Voided' } });

  const [allSum] = await col.aggregate([
    { $match: queryAll },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalQty', '$invoiceQty'] } } } }
  ]).toArray();

  const [activeSum] = await col.aggregate([
    { $match: { ...queryAll, status: { $ne: 'Voided' } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalQty', '$invoiceQty'] } } } }
  ]).toArray();

  console.log('Query without status filter -> total:', allSum?.total, 'count:', allCount);
  console.log('Query WITH status: { $ne: "Voided" } -> total:', activeSum?.total, 'count:', withoutVoided);

  // Now let's see what store = Nalagarh specifically gives:
  const nalagarhStoreQuery = {
    $or: [
      { circle: /nalagarh/i },
      { subcircle: /nalagarh/i },
      { billingFrom: /nalagarh/i },
      { store: /nalagarh/i }
    ]
  };

  const [nalagarhAllSum] = await col.aggregate([
    { $match: nalagarhStoreQuery },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalQty', '$invoiceQty'] } } } }
  ]).toArray();

  const [nalagarhActiveSum] = await col.aggregate([
    { $match: { ...nalagarhStoreQuery, status: { $ne: 'Voided' } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalQty', '$invoiceQty'] } } } }
  ]).toArray();

  console.log('Nalagarh specifically without status filter -> total:', nalagarhAllSum?.total);
  console.log('Nalagarh specifically WITH status: { $ne: "Voided" } -> total:', nalagarhActiveSum?.total);

  await mongoose.disconnect();
}
run().catch(console.error);
