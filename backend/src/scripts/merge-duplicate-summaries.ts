import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const getCirclePackage = (circ?: string): string => {
  const c = (circ || '').toLowerCase();
  if (c.includes('nahan') || c.includes('solan') || c.includes('kumarhatti') || c.includes('nalagarh')) {
    return 'Package 1(S/N)';
  }
  if (c.includes('rampur') || c.includes('rohru')) {
    return 'Package 2(R/R)';
  }
  return '';
};

async function mergeDuplicates() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  console.log('Finding all duplicate itemsummaries by (itemId, circle)...');

  const duplicateGroups = await db.collection('itemsummaries').aggregate([
    {
      $group: {
        _id: { itemId: '$itemId', circle: '$circle' },
        count: { $sum: 1 },
        docs: { $push: '$$ROOT' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`Found ${duplicateGroups.length} duplicate groups.`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const group of duplicateGroups) {
    const docs = group.docs;
    const circ = group._id.circle;
    const canonicalPkg = getCirclePackage(circ);

    // Pick canonical document (prefer doc that has the canonical package or highest diQty/invQty)
    let canonicalDoc = docs.find((d: any) => d.package === canonicalPkg);
    if (!canonicalDoc) {
      canonicalDoc = docs[0];
    }

    const otherDocs = docs.filter((d: any) => d._id.toString() !== canonicalDoc._id.toString());

    // Fields to sum together
    const sumFields = [
      'loaQty', 'bomQty', 'diQty', 'invQty', 'actQty', 'srtQty', 'billedQty',
      'poQty', 'mhrovQty', 'ra60Qty', 'ra60Amt', 'ra30Qty', 'ra30Amt', 'ra10Qty', 'ra10Amt',
      'er90Qty', 'er90Amt', 'er10Qty', 'er10Amt', 'jmcQty', 'wipQty', 'cBillQty', 'cBillAmt',
      'woQty', 'demandQty', 'receivedQty', 'transferInQty', 'transferOutQty', 'issuedQty', 'returnedQty'
    ];

    const updates: Record<string, any> = {
      package: canonicalPkg || canonicalDoc.package
    };

    // Note: If loaQty or bomQty is identical on both docs (e.g. copied from master), don't double count!
    // Take max for loaQty, bomQty; take sum for transaction quantities
    updates['loaQty'] = Math.max(...docs.map((d: any) => d.loaQty || 0));
    updates['bomQty'] = Math.max(...docs.map((d: any) => d.bomQty || 0));

    for (const f of sumFields) {
      if (f === 'loaQty' || f === 'bomQty') continue;
      const sum = docs.reduce((acc: number, d: any) => acc + (Number(d[f]) || 0), 0);
      updates[f] = sum;
    }

    // Merge contractors and vendors arrays
    const contractors = Array.from(new Set(docs.flatMap((d: any) => d.contractors || []).filter(Boolean)));
    const vendors = Array.from(new Set(docs.flatMap((d: any) => d.vendors || []).filter(Boolean)));
    updates['contractors'] = contractors;
    updates['vendors'] = vendors;

    // Apply update to canonical doc
    await db.collection('itemsummaries').updateOne(
      { _id: canonicalDoc._id },
      { $set: updates }
    );
    mergedCount++;

    // Delete the duplicate docs
    const idsToDelete = otherDocs.map((d: any) => d._id);
    const delRes = await db.collection('itemsummaries').deleteMany({
      _id: { $in: idsToDelete }
    });
    deletedCount += delRes.deletedCount;
  }

  console.log(`Merged ${mergedCount} groups, deleted ${deletedCount} duplicate ItemSummary documents.`);

  // Also fix any remaining documents that have empty package or hyphenated package
  const res1 = await db.collection('itemsummaries').updateMany(
    { circle: { $in: ['Nahan', 'Solan'] }, package: { $ne: 'Package 1(S/N)' } },
    { $set: { package: 'Package 1(S/N)' } }
  );
  console.log(`Normalized ${res1.modifiedCount} Package 1(S/N) records.`);

  const res2 = await db.collection('itemsummaries').updateMany(
    { circle: { $in: ['Rampur', 'Rohru'] }, package: { $ne: 'Package 2(R/R)' } },
    { $set: { package: 'Package 2(R/R)' } }
  );
  console.log(`Normalized ${res2.modifiedCount} Package 2(R/R) records.`);

  // Verify no duplicates remain
  const remainingDups = await db.collection('itemsummaries').aggregate([
    { $group: { _id: { itemId: '$itemId', circle: '$circle' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`Remaining duplicate (itemId, circle) pairs: ${remainingDups.length}`);

  await mongoose.disconnect();
}

mergeDuplicates().catch(console.error);
