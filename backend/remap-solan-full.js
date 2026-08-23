/**
 * remap-solan-full.js
 * Remaps all Solan items (re-imported) across DI, PI, StoreInwardEntries.
 * Items store data in dynamicData.circle and dynamicData.tempCode.
 * 
 * Usage:
 *   node remap-solan-full.js          (dry run)
 *   node remap-solan-full.js --execute (apply changes)
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const DRY_RUN = process.argv[2] !== '--execute';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log(DRY_RUN
    ? '🔍 DRY RUN — no changes will be made. Pass --execute to apply.'
    : '⚡ EXECUTING — changes will be applied to DB.');
  console.log('');

  // ─── Step 1: Load all Solan items ────────────────────────────────────────
  const solanItems = await db.collection('items').find({
    'dynamicData.circle': 'Solan',
    'isDeleted': { $ne: true }
  }).toArray();

  console.log(`✅ Solan items found in DB: ${solanItems.length}`);
  if (solanItems.length === 0) {
    console.log('❌ No Solan items found — make sure items are imported first!');
    return mongoose.disconnect();
  }

  // Build tempCode → _id map
  const tempCodeToId = {};
  const tempCodeToItem = {};
  for (const item of solanItems) {
    const tc = item.dynamicData?.tempCode;
    if (tc) {
      tempCodeToId[tc] = item._id;
      tempCodeToItem[tc] = item;
    }
  }
  console.log(`   tempCode map entries: ${Object.keys(tempCodeToId).length}`);
  console.log('');

  let totalUpdated = 0;

  // ─── Step 2: Remap DI line items ─────────────────────────────────────────
  console.log('─── Remapping DI Registrations ───');
  const diDocs = await db.collection('dis').find({ 'lineItems.circle': 'Solan' }).toArray();
  console.log(`Found ${diDocs.length} DIs with Solan line items`);
  let diUpdated = 0;

  for (const di of diDocs) {
    let modified = false;
    const updatedLineItems = (di.lineItems || []).map(li => {
      if (li.circle !== 'Solan') return li;
      const newItemId = tempCodeToId[li.tempCode];
      if (!newItemId) return li;
      const alreadyLinked = li.itemId && li.itemId.toString() === newItemId.toString();
      if (alreadyLinked) return li;
      modified = true;
      return { ...li, itemId: newItemId };
    });

    if (modified) {
      diUpdated++;
      if (!DRY_RUN) {
        await db.collection('dis').updateOne(
          { _id: di._id },
          { $set: { lineItems: updatedLineItems } }
        );
      }
    }
  }
  console.log(`✅ DIs updated: ${diUpdated}`);
  totalUpdated += diUpdated;
  console.log('');

  // ─── Step 3: Remap PI line items ──────────────────────────────────────────
  console.log('─── Remapping Purchase Invoices ───');
  const piDocs = await db.collection('purchaseinvoices').find({ 'lineItems.circle': 'Solan' }).toArray();
  console.log(`Found ${piDocs.length} PIs with Solan line items`);
  let piUpdated = 0;

  for (const pi of piDocs) {
    let modified = false;
    const updatedLineItems = (pi.lineItems || []).map(li => {
      if (li.circle !== 'Solan') return li;
      const newItemId = tempCodeToId[li.tempCode];
      if (!newItemId) return li;
      const alreadyLinked = li.itemId && li.itemId.toString() === newItemId.toString();
      if (alreadyLinked) return li;
      modified = true;
      return { ...li, itemId: newItemId };
    });

    if (modified) {
      piUpdated++;
      if (!DRY_RUN) {
        await db.collection('purchaseinvoices').updateOne(
          { _id: pi._id },
          { $set: { lineItems: updatedLineItems } }
        );
      }
    }
  }
  console.log(`✅ PIs updated: ${piUpdated}`);
  totalUpdated += piUpdated;
  console.log('');

  // ─── Step 4: Remap StoreInwardEntries ────────────────────────────────────
  console.log('─── Remapping Store Inward Entries ───');
  const irDocs = await db.collection('storeinwardentries').find({ circle: 'Solan' }).toArray();
  console.log(`Found ${irDocs.length} Store Inward Entries with Solan circle`);
  let irUpdated = 0;

  for (const ir of irDocs) {
    const newItemId = tempCodeToId[ir.tempCode];
    if (!newItemId) continue;
    const alreadyLinked = ir.itemId && ir.itemId.toString() === newItemId.toString();
    if (alreadyLinked) continue;
    irUpdated++;
    if (!DRY_RUN) {
      await db.collection('storeinwardentries').updateOne(
        { _id: ir._id },
        { $set: { itemId: newItemId } }
      );
    }
  }
  console.log(`✅ Store Inward Entries updated: ${irUpdated}`);
  totalUpdated += irUpdated;
  console.log('');

  // ─── Step 5: Remap Demand Notes (if any) ─────────────────────────────────
  try {
    const dnDocs = await db.collection('demandnotes').find({ 'items.circle': 'Solan' }).toArray();
    if (dnDocs.length > 0) {
      console.log('─── Remapping Demand Notes ───');
      let dnUpdated = 0;
      for (const dn of dnDocs) {
        let modified = false;
        const updatedItems = (dn.items || []).map(item => {
          if (item.circle !== 'Solan') return item;
          const newItemId = tempCodeToId[item.tempCode];
          if (!newItemId) return item;
          const alreadyLinked = item.itemId && item.itemId.toString() === newItemId.toString();
          if (alreadyLinked) return item;
          modified = true;
          return { ...item, itemId: newItemId };
        });
        if (modified) {
          dnUpdated++;
          if (!DRY_RUN) {
            await db.collection('demandnotes').updateOne(
              { _id: dn._id },
              { $set: { items: updatedItems } }
            );
          }
        }
      }
      console.log(`✅ Demand Notes updated: ${dnUpdated}`);
      totalUpdated += dnUpdated;
      console.log('');
    }
  } catch (e) { /* collection may not exist */ }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Solan items loaded  : ${solanItems.length}`);
  console.log(`  Total records ${DRY_RUN ? 'to update' : 'updated'}: ${totalUpdated}`);
  if (DRY_RUN) {
    console.log('');
    console.log('  Run with --execute to apply.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
});
