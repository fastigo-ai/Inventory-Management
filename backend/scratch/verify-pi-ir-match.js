/**
 * verify-pi-ir-match.js (fixed)
 * Compare SUM of PI line items per tempCode vs SUM of IR entries per tempCode, per PI.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find(
    { 'lineItems.0': { $exists: true } },
    { projection: { invoiceNumber: 1, lineItems: 1 } }
  ).limit(20).toArray();

  let matchCount = 0, mismatchCount = 0, pendingCount = 0;

  for (const pi of pis) {
    // Group PI line items by tempCode and sum quantities
    const piByTempCode = {};
    for (const item of pi.lineItems || []) {
      const tc = item.tempCode;
      if (!tc) continue;
      const qty = (item.totalInventory > 0 ? item.totalInventory : item.quantity) || 0;
      piByTempCode[tc] = (piByTempCode[tc] || 0) + qty;
    }

    for (const [tc, piTotalQty] of Object.entries(piByTempCode)) {
      // Sum approved IR for this PI + tempCode
      const approvedIR = await db.collection('storeinwardentries').aggregate([
        { $match: { purchaseInvoiceId: pi._id, tempCode: tc, status: { $nin: ['DRAFT', 'PENDING_RECEIPT'] } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$invoiceQty' } }, count: { $sum: 1 } } }
      ]).toArray();

      // Sum pending IR
      const pendingIR = await db.collection('storeinwardentries').aggregate([
        { $match: { purchaseInvoiceId: pi._id, tempCode: tc, status: { $in: ['PENDING_RECEIPT', 'DRAFT'] } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$invoiceQty' } }, count: { $sum: 1 } } }
      ]).toArray();

      const approvedQty = approvedIR[0]?.total || 0;
      const pendingQty  = pendingIR[0]?.total  || 0;
      const totalIRQty  = approvedQty + pendingQty;

      if (totalIRQty === 0 && approvedQty === 0) {
        pendingCount++;
        continue;
      }

      if (Math.abs(totalIRQty - piTotalQty) < 0.01) {
        matchCount++;
        console.log(`✅ PI ${pi.invoiceNumber} | tempCode ${tc}: PI=${piTotalQty}, IR=${totalIRQty} (approved: ${approvedQty}, pending: ${pendingQty})`);
      } else {
        mismatchCount++;
        console.log(`❌ PI ${pi.invoiceNumber} | tempCode ${tc}: PI=${piTotalQty}, IR total=${totalIRQty} (approved: ${approvedQty}, pending: ${pendingQty}) — DIFF: ${(totalIRQty - piTotalQty).toFixed(2)}`);
      }
    }
  }

  console.log('');
  console.log('=== SUMMARY (first 20 PIs) ===');
  console.log(`✅ Matching (PI qty = IR qty) : ${matchCount}`);
  console.log(`❌ Mismatching               : ${mismatchCount}`);
  console.log(`⚪ No IR registered yet      : ${pendingCount}`);

  await mongoose.disconnect();
});
