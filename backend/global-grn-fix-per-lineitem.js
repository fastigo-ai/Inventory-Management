const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: './.env' });

const PROGRESS_FILE = '/tmp/global-grn-progress.json';

async function fixCircle(circle) {
  const regex = new RegExp(`^${circle}$`, 'i');
  let totalCreated = 0, totalDeleted = 0, totalSkipped = 0, piProcessed = 0;

  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': regex }).toArray();

  for (const pi of pis) {
    // Group line items by tempCode
    const itemsByTempCode = {};
    for (const item of pi.lineItems) {
      if (!item.circle || !regex.test(item.circle)) continue;
      if (!item.tempCode) continue;
      if (!itemsByTempCode[item.tempCode]) itemsByTempCode[item.tempCode] = [];
      itemsByTempCode[item.tempCode].push(item);
    }

    for (const [tempCode, items] of Object.entries(itemsByTempCode)) {
      const totalPiQtyForTc = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

      // Get existing approved GRNs for this PI + tempCode
      const existingEntries = await mongoose.connection.collection('storeinwardentries').find({
        purchaseInvoiceId: pi._id,
        tempCode,
        circle: regex,
        status: { $in: ['APPROVED', 'SUBMITTED'] }
      }).toArray();

      const existingQty = existingEntries.reduce((s, e) =>
        s + (e.packingList?.reduce((ps, p) => ps + (Number(p.quantity) || 0), 0) || Number(e.invoiceQty) || 0), 0);

      // If already correctly covered, skip
      if (Math.abs(existingQty - totalPiQtyForTc) < 0.01 && existingEntries.length === items.length) {
        totalSkipped++;
        continue;
      }

      // Delete incorrect auto-generated entries and recreate per line item
      const autoEntries = existingEntries.filter(e => e.inwardId?.startsWith('INW-AUTO-'));
      if (autoEntries.length > 0) {
        await mongoose.connection.collection('storeinwardentries').deleteMany({
          _id: { $in: autoEntries.map(e => e._id) }
        });
        totalDeleted += autoEntries.length;
      }

      // Only recreate if existing manually-entered GRN qty doesn't already match
      const manualEntries = existingEntries.filter(e => !e.inwardId?.startsWith('INW-AUTO-'));
      const manualQty = manualEntries.reduce((s, e) =>
        s + (e.packingList?.reduce((ps, p) => ps + (Number(p.quantity) || 0), 0) || Number(e.invoiceQty) || 0), 0);

      if (manualQty >= totalPiQtyForTc) {
        totalSkipped++;
        continue;
      }

      // Create one GRN per line item
      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;
        await mongoose.connection.collection('storeinwardentries').insertOne({
          inwardId: `INW-AUTO-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          purchaseInvoiceId: pi._id,
          circle,
          tempCode,
          itemName: item.itemName,
          hsnCode: item.hsnCode || '',
          invoiceQty: qty,
          receivedQty: qty,
          rejectedQty: 0,
          packingList: [{ description: item.itemName, quantity: qty }],
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        totalCreated++;
      }
    }

    piProcessed++;
    // Write progress every 10 PIs
    if (piProcessed % 10 === 0) {
      const prog = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      prog[circle] = { piProcessed, piTotal: pis.length, created: totalCreated, deleted: totalDeleted, skipped: totalSkipped, status: 'running' };
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog));
    }
  }

  return { piProcessed, created: totalCreated, deleted: totalDeleted, skipped: totalSkipped };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const circles = ['Nahan', 'Solan', 'Rampur'];
  const progress = {};
  circles.forEach(c => progress[c] = { piProcessed: 0, piTotal: 0, created: 0, deleted: 0, skipped: 0, status: 'pending' });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));

  console.log("=== GLOBAL GRN FIX: Per-Line-Item for all circles ===\n");

  for (const circle of circles) {
    console.log(`[${circle}] Starting...`);
    progress[circle].status = 'running';
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));

    const result = await fixCircle(circle);

    progress[circle] = { ...result, status: 'done', piTotal: result.piProcessed };
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));

    console.log(`[${circle}] ✅ DONE → PIs: ${result.piProcessed} | Created: ${result.created} | Deleted wrong: ${result.deleted} | Skipped: ${result.skipped}`);
  }

  console.log("\n✅ GLOBAL FIX COMPLETE");
  process.exit(0);
}
run().catch(console.error);
