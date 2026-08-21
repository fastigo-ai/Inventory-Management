const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circle = 'Rohru';
  const regex = new RegExp(`^${circle}$`, 'i');
  let totalCreated = 0, totalDeleted = 0, totalSkipped = 0;

  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': regex }).toArray();

  console.log(`[Rohru] Found ${pis.length} PIs. Processing...`);

  for (const pi of pis) {
    const itemsByTempCode = {};
    for (const item of pi.lineItems) {
      if (!item.circle || !regex.test(item.circle) || !item.tempCode) continue;
      if (!itemsByTempCode[item.tempCode]) itemsByTempCode[item.tempCode] = [];
      itemsByTempCode[item.tempCode].push(item);
    }

    for (const [tempCode, items] of Object.entries(itemsByTempCode)) {
      const totalPiQtyForTc = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

      const existingEntries = await mongoose.connection.collection('storeinwardentries').find({
        purchaseInvoiceId: pi._id,
        tempCode,
        circle: regex,
        status: { $in: ['APPROVED', 'SUBMITTED'] }
      }).toArray();

      const existingQty = existingEntries.reduce((s, e) =>
        s + (e.packingList?.reduce((ps, p) => ps + (Number(p.quantity)||0), 0) || Number(e.invoiceQty)||0), 0);

      if (Math.abs(existingQty - totalPiQtyForTc) < 0.01 && existingEntries.length === items.length) {
        totalSkipped++; continue;
      }

      // Delete wrong auto-entries
      const autoEntries = existingEntries.filter(e => e.inwardId?.startsWith('INW-AUTO-'));
      if (autoEntries.length > 0) {
        await mongoose.connection.collection('storeinwardentries').deleteMany({
          _id: { $in: autoEntries.map(e => e._id) }
        });
        totalDeleted += autoEntries.length;
      }

      // Check manual GRN qty
      const manualQty = existingEntries
        .filter(e => !e.inwardId?.startsWith('INW-AUTO-'))
        .reduce((s, e) => s + (e.packingList?.reduce((ps, p) => ps + (Number(p.quantity)||0), 0) || Number(e.invoiceQty)||0), 0);

      if (manualQty >= totalPiQtyForTc) { totalSkipped++; continue; }

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
  }

  console.log(`[Rohru] ✅ DONE → PIs: ${pis.length} | Created: ${totalCreated} | Deleted wrong: ${totalDeleted} | Skipped: ${totalSkipped}`);
  process.exit(0);
}
run().catch(console.error);
