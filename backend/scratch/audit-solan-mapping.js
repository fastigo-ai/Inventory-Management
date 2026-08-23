/**
 * audit-solan-mapping.js
 * Check which collections still have Solan item references that need remapping.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // 1. Get all new Solan items (re-imported)
  const solanItems = await db.collection('items').find({ circle: 'Solan' }).toArray();
  console.log(`✅ New Solan items in DB: ${solanItems.length}`);

  // Build tempCode -> _id map
  const tempCodeMap = {};
  for (const item of solanItems) {
    if (item.tempCode) tempCodeMap[item.tempCode] = item._id;
  }
  console.log(`   tempCode map size: ${Object.keys(tempCodeMap).length}`);
  console.log('');

  // 2. Check DIs
  const diWithSolan = await db.collection('dis').find({ 'lineItems.circle': 'Solan' }).toArray();
  let diUnlinked = 0;
  for (const di of diWithSolan) {
    for (const li of di.lineItems || []) {
      if (li.circle !== 'Solan') continue;
      const expectedId = tempCodeMap[li.tempCode];
      if (!expectedId) continue;
      if (!li.itemId || li.itemId.toString() !== expectedId.toString()) diUnlinked++;
    }
  }
  console.log(`📋 DIs with Solan items: ${diWithSolan.length}`);
  console.log(`   Unlinked line items : ${diUnlinked}`);
  console.log('');

  // 3. Check PIs
  const piWithSolan = await db.collection('purchaseinvoices').find({ 'lineItems.circle': 'Solan' }).toArray();
  let piUnlinked = 0;
  for (const pi of piWithSolan) {
    for (const li of pi.lineItems || []) {
      if (li.circle !== 'Solan') continue;
      const expectedId = tempCodeMap[li.tempCode];
      if (!expectedId) continue;
      if (!li.itemId || li.itemId.toString() !== expectedId.toString()) piUnlinked++;
    }
  }
  console.log(`📋 PIs with Solan items: ${piWithSolan.length}`);
  console.log(`   Unlinked line items : ${piUnlinked}`);
  console.log('');

  // 4. Check Store Inward Entries
  const irWithSolan = await db.collection('storeinwardentries').find({ circle: 'Solan' }).toArray();
  let irUnlinked = 0;
  for (const ir of irWithSolan) {
    const expectedId = tempCodeMap[ir.tempCode];
    if (!expectedId) continue;
    if (!ir.itemId || ir.itemId.toString() !== expectedId.toString()) irUnlinked++;
  }
  console.log(`📋 Store Inward Entries (Solan): ${irWithSolan.length}`);
  console.log(`   Unlinked            : ${irUnlinked}`);
  console.log('');

  // 5. Check other collections
  const collections = ['demandnotes', 'contractorissues', 'stockoutwardentries', 'grns', 'wipentries', 'mhrovs'];
  for (const col of collections) {
    try {
      const count = await db.collection(col).countDocuments({ circle: 'Solan' });
      if (count > 0) console.log(`📋 ${col} with Solan: ${count}`);
    } catch (e) { /* collection doesn't exist */ }
  }

  await mongoose.disconnect();
});
