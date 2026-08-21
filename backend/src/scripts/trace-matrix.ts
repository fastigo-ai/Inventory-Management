import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Simulates exactly what computeItemMatrixSummary does for STP 9 MTR
 * to identify why MRHOV shows 0
 */
async function traceMatrix() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;

  // Load items - simulating exactly what the API does
  const items = await db.collection('items').find(
    { isDeleted: { $ne: true } },
    { projection: { dynamicData: 1, tempCode: 1, sku: 1, name: 1, unit: 1, circle: 1, package: 1 } }
  ).toArray();

  // Build groupedItemsMap exactly like the API
  const groupedItemsMap = new Map();
  const itemIdToKeyMap = new Map();

  items.forEach((it: any) => {
    const d = it.dynamicData || {};
    const loaSrNo = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();
    const name = String(d.name || d.itemName || d.description || it.name || '').trim();
    const pkgVal = String(d.package || it.package || '').trim();
    const circleVal = String(d.circle || it.circle || '').trim();
    const groupKey = `${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${loaSrNo}`;

    if (!groupedItemsMap.has(groupKey)) {
      groupedItemsMap.set(groupKey, {
        loaSerialNo: loaSrNo, tempCode: tc, itemName: name, package: pkgVal, circle: circleVal, itemIds: []
      });
    }
    groupedItemsMap.get(groupKey).itemIds.push(it._id.toString());
    itemIdToKeyMap.set(it._id.toString(), groupKey);
  });

  // Find groupKey for item 6a8299025d7ee9d212355429 (STP 9 MTR, Rohru LOA 2026)
  const targetItemId = '6a8299025d7ee9d212355429';
  const targetGroupKey = itemIdToKeyMap.get(targetItemId);
  console.log(`\n=== Target Item ID: ${targetItemId} ===`);
  console.log(`  Maps to groupKey: "${targetGroupKey}"`);
  if (targetGroupKey) {
    const grp = groupedItemsMap.get(targetGroupKey);
    console.log(`  Group: ${JSON.stringify(grp)}`);
  }

  // Now simulate inward processing
  const inwards = await db.collection('storeinwardentries').find(
    {},
    { projection: { circle: 1, subcircle: 1, billingFrom: 1, invoiceQty: 1, acceptedQty: 1, totalQty: 1, itemId: 1, tempCode: 1, loaSerialNo: 1, serialNumber: 1, package: 1 } }
  ).toArray();

  console.log(`\nTotal StoreInwardEntry records: ${inwards.length}`);

  const inwardMap = new Map<string, Record<string, number>>();
  let matchCount = 0;
  let noMatchCount = 0;
  let stp9Rohru2026Count = 0;

  inwards.forEach((doc: any) => {
    const qty = Number(doc.invoiceQty || doc.acceptedQty || doc.totalQty || 0);
    if (qty > 0) {
      const idStr = doc.itemId ? doc.itemId.toString() : '';
      
      // This is exactly what getTargetTempCodes does when itemId matches
      if (idStr && itemIdToKeyMap.has(idStr)) {
        const tc = itemIdToKeyMap.get(idStr)!;
        if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
        const obj = inwardMap.get(tc)!;
        const circ = (doc.circle || doc.subcircle || doc.billingFrom || '').toLowerCase();
        if (circ.includes('solan')) obj.solan += qty;
        else if (circ.includes('nahan')) obj.nahan += qty;
        else if (circ.includes('rampur')) obj.rampur += qty;
        else if (circ.includes('rohru')) obj.rohru += qty;
        else obj.nahan += qty;
        matchCount++;

        if (idStr === targetItemId) {
          stp9Rohru2026Count++;
        }
      } else {
        noMatchCount++;
      }
    }
  });

  console.log(`\nInward matching: ${matchCount} matched, ${noMatchCount} not matched (no itemId in itemIdToKeyMap)`);
  console.log(`STP 9 MTR Rohru LOA 2026 matched inward records: ${stp9Rohru2026Count}`);

  // Check what inwardMap has for the target group key
  if (targetGroupKey) {
    const inv = inwardMap.get(targetGroupKey);
    console.log(`\ninwardMap for "${targetGroupKey}": ${JSON.stringify(inv || 'NOT FOUND')}`);
  }

  // Show all items whose itemId is NOT in itemIdToKeyMap (these will be missed)
  const noMatchItems = await db.collection('storeinwardentries').aggregate([
    { $match: { itemId: { $exists: true, $ne: null } } },
    { $group: { _id: '$itemId', count: { $sum: 1 }, sample: { $first: '$$ROOT' } } },
    { $limit: 10 }
  ]).toArray();

  let missingFromMap = 0;
  for (const item of noMatchItems) {
    if (!itemIdToKeyMap.has(item._id.toString())) {
      missingFromMap++;
      if (missingFromMap <= 5) {
        console.log(`\nMissing from itemIdToKeyMap: itemId=${item._id} | itemName=${item.sample.itemName} | count=${item.count}`);
      }
    }
  }
  console.log(`\nUnique itemIds in StoreInwardEntry missing from itemIdToKeyMap: ${missingFromMap} (out of first 10 checked)`);

  await mongoose.disconnect();
}

traceMatrix().catch(console.error);
