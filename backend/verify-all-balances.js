const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circles = ['Nahan', 'Rohru', 'Solan', 'Rampur'];

  console.log("=== FINAL MULTI-CIRCLE INVOICE vs GRN INWARD VERIFICATION ===");
  console.log(`${'Circle'.padEnd(12)} ${'Total PIs'.padEnd(12)} ${'PI LineItems'.padEnd(14)} ${'Inward Entries'.padEnd(16)} ${'PI Total Qty'.padEnd(16)} ${'Inward Total Qty'.padEnd(18)} Match Status`);
  console.log('-'.repeat(100));

  for (const circle of circles) {
    const regex = new RegExp(`^${circle}$`, 'i');

    const pis = await mongoose.connection.collection('purchaseinvoices').find({ 'lineItems.circle': regex }).toArray();
    let totalPiItems = 0;
    let totalPiQty = 0;
    for (const pi of pis) {
      for (const li of pi.lineItems) {
        if (li.circle && regex.test(li.circle)) {
          totalPiItems++;
          totalPiQty += Number(li.quantity) || 0;
        }
      }
    }

    const inwards = await mongoose.connection.collection('storeinwardentries').find({ circle: regex, status: { $in: ['APPROVED', 'SUBMITTED'] } }).toArray();
    let totalInwardQty = 0;
    for (const inw of inwards) {
      const plQty = inw.packingList?.reduce((s, p) => s + (Number(p.quantity) || 0), 0) || 0;
      totalInwardQty += (plQty || Number(inw.invoiceQty) || 0);
    }

    const match = Math.abs(totalPiQty - totalInwardQty) < 0.01 ? '✅ 100% MATCH' : `⚠️ Diff: ${(totalPiQty - totalInwardQty).toFixed(2)}`;
    console.log(`${circle.padEnd(12)} ${String(pis.length).padEnd(12)} ${String(totalPiItems).padEnd(14)} ${String(inwards.length).padEnd(16)} ${String(totalPiQty.toFixed(2)).padEnd(16)} ${String(totalInwardQty.toFixed(2)).padEnd(18)} ${match}`);
  }

  process.exit(0);
}
run().catch(console.error);
