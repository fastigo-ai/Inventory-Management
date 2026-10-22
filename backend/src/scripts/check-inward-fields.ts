import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const inwards = await db.collection('storeinwardentries').find({
    status: { $ne: 'Voided' },
    circle: /solan/i
  }).toArray();

  let hasStoreField = 0;
  let hasSubcircleField = 0;
  const storeValues: Record<string, number> = {};
  const subcircleValues: Record<string, number> = {};

  for (const doc of inwards) {
    if (doc.store) {
      hasStoreField++;
      storeValues[doc.store] = (storeValues[doc.store] || 0) + 1;
    }
    if (doc.subcircle) {
      hasSubcircleField++;
      subcircleValues[doc.subcircle] = (subcircleValues[doc.subcircle] || 0) + 1;
    }
  }

  console.log({
    totalSolanInwards: inwards.length,
    hasStoreField,
    storeValues,
    hasSubcircleField,
    subcircleValues
  });

  // Check 5 documents without subcircle
  const withoutSubcircle = await db.collection('storeinwardentries').find({
    status: { $ne: 'Voided' },
    circle: /solan/i,
    $or: [{ subcircle: null }, { subcircle: '' }, { subcircle: { $exists: false } }]
  }).limit(3).toArray();
  console.log('Sample without subcircle:', withoutSubcircle.map(d => ({
    _id: d._id,
    invoiceNumber: d.invoiceNumber,
    vendorName: d.vendorName,
    circle: d.circle,
    subcircle: d.subcircle,
    store: d.store,
    itemName: d.itemName,
    totalQty: d.totalQty
  })));

  await mongoose.disconnect();
}
run().catch(console.error);
