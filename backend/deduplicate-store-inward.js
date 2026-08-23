/**
 * deduplicate-store-inward.js
 * 
 * Problem: When a PI was edited, new storeinwardentries were created
 * without cleaning up already-APPROVED old ones, causing duplicate IR counts.
 * 
 * Fix: For each purchaseInvoiceId, for each tempCode, keep only as many
 * storeinwardentries as the PI actually has line items for that tempCode.
 * Delete the extras (oldest first).
 * 
 * SAFE: Only deduplicates when count > expected. Dry-run first.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const DRY_RUN = process.argv[2] !== '--execute';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made. Pass --execute to apply.' : '⚡ EXECUTING — changes will be applied.');
  console.log('');

  // Get all PIs that have storeinwardentries
  const piIds = await db.collection('storeinwardentries')
    .distinct('purchaseInvoiceId');

  let totalDeleted = 0;
  let piProcessed = 0;
  let piWithDuplicates = 0;

  for (const piId of piIds) {
    if (!piId) continue;

    // Get PI line items
    const pi = await db.collection('purchaseinvoices').findOne(
      { _id: typeof piId === 'string' ? new mongoose.Types.ObjectId(piId) : piId },
      { projection: { lineItems: 1, invoiceNumber: 1 } }
    );

    if (!pi || !pi.lineItems) continue;

    // Count how many line items per tempCode the PI has
    const piTempCodeCounts = {};
    for (const item of pi.lineItems) {
      const tc = item.tempCode;
      if (!tc) continue;
      piTempCodeCounts[tc] = (piTempCodeCounts[tc] || 0) + 1;
    }

    // Get all storeinwardentries for this PI grouped by tempCode
    const entries = await db.collection('storeinwardentries')
      .find({ purchaseInvoiceId: piId })
      .sort({ _id: 1 }) // oldest first
      .toArray();

    // Group by tempCode
    const byTempCode = {};
    for (const entry of entries) {
      const tc = entry.tempCode;
      if (!tc) continue;
      if (!byTempCode[tc]) byTempCode[tc] = [];
      byTempCode[tc].push(entry);
    }

    let piHadDuplicates = false;

    // For each tempCode in IR, check against PI expected count
    for (const [tc, irEntries] of Object.entries(byTempCode)) {
      const expected = piTempCodeCounts[tc] || 0;
      const actual = irEntries.length;

      if (actual > expected) {
        // Sort: keep newest, delete oldest extras
        irEntries.sort((a, b) => b._id.toString().localeCompare(a._id.toString())); // newest first
        const toDelete = irEntries.slice(expected); // everything beyond the expected count
        const idsToDelete = toDelete.map(e => e._id);

        const extraQty = toDelete.reduce((s, e) => s + (e.invoiceQty || 0), 0);

        console.log(`PI ${pi.invoiceNumber} | tempCode ${tc}: ${actual} entries, expected ${expected}. Removing ${toDelete.length} duplicates (qty: ${extraQty})`);
        piHadDuplicates = true;

        if (!DRY_RUN) {
          await db.collection('storeinwardentries').deleteMany({ _id: { $in: idsToDelete } });
          totalDeleted += toDelete.length;
        } else {
          totalDeleted += toDelete.length; // count for dry run
        }
      }
    }

    if (piHadDuplicates) piWithDuplicates++;
    piProcessed++;

    if (piProcessed % 100 === 0) {
      process.stdout.write(`  Processed ${piProcessed}/${piIds.length} PIs...\r`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total PIs processed    : ${piProcessed}`);
  console.log(`  PIs with duplicates    : ${piWithDuplicates}`);
  console.log(`  Duplicate entries ${DRY_RUN ? 'found' : 'deleted'}: ${totalDeleted}`);
  if (DRY_RUN) {
    console.log('');
    console.log('  Run with --execute to apply these deletions.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
