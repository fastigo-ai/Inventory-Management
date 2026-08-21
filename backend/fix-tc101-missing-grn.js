const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circle = 'Nahan';
  const regex = new RegExp(`^${circle}$`, 'i');
  const tempCode = '101';

  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems': { $elemMatch: { tempCode, circle: regex } } }).toArray();

  let totalCreated = 0, totalSkipped = 0, totalPiQty = 0;

  for (const pi of pis) {
    // Get ALL line items for this tempCode + circle in this PI
    const items = pi.lineItems.filter(i => i.tempCode === tempCode && i.circle && regex.test(i.circle));
    if (items.length === 0) continue;

    // Count existing APPROVED GRN entries for this PI + tempCode + circle
    const existingEntries = await mongoose.connection.collection('storeinwardentries').find({
      purchaseInvoiceId: pi._id,
      tempCode,
      circle: regex,
      status: { $in: ['APPROVED', 'SUBMITTED'] }
    }).toArray();

    const existingCount = existingEntries.length;
    const existingQty = existingEntries.reduce((s, e) => s + (e.packingList?.reduce((ps, p) => ps + (Number(p.quantity)||0), 0) || Number(e.invoiceQty)||0), 0);

    console.log(`PI: ${pi.invoiceNumber} | Line Items: ${items.length} | Existing GRNs: ${existingCount} | Existing GRN Qty: ${existingQty}`);

    // Create GRN for each line item that isn't already covered
    let piItemQty = 0;
    for (const item of items) {
      piItemQty += Number(item.quantity) || 0;
    }
    totalPiQty += piItemQty;

    // If existing GRN qty already covers this PI's total, skip
    if (existingQty >= piItemQty) {
      console.log(`  ✅ Already fully covered. PI Qty: ${piItemQty}, GRN Qty: ${existingQty}`);
      totalSkipped += items.length;
      continue;
    }

    // Delete existing auto-created entries for this PI (they may be partial/wrong)
    // and recreate properly per line item
    const autoEntries = existingEntries.filter(e => e.inwardId?.startsWith('INW-AUTO-'));
    if (autoEntries.length > 0) {
      await mongoose.connection.collection('storeinwardentries').deleteMany({
        _id: { $in: autoEntries.map(e => e._id) }
      });
      console.log(`  🗑️ Deleted ${autoEntries.length} incorrect auto-GRN entries`);
    }

    // Now create one GRN per line item
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
      console.log(`  ✅ GRN Created: Qty ${qty}`);
      totalCreated++;
    }
  }

  // Final verification
  const allInwards = await mongoose.connection.collection('storeinwardentries')
    .find({ tempCode, circle: regex, status: { $in: ['APPROVED', 'SUBMITTED'] } }).toArray();
  const totalQty = allInwards.reduce((s, i) => s + (i.packingList?.reduce((ps, p) => ps + (Number(p.quantity)||0), 0) || Number(i.invoiceQty)||0), 0);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total PI Qty (all line items): ${totalPiQty}`);
  console.log(`GRNs Created this run: ${totalCreated}`);
  console.log(`Final Total Inwarded Qty: ${totalQty}`);
  console.log(`Difference (PI - Inwarded): ${totalPiQty - totalQty}`);

  process.exit(0);
}
run().catch(console.error);
