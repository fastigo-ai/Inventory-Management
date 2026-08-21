const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circle = 'Rampur';
  const regex = new RegExp(`^${circle}$`, 'i');

  // Get all Rampur inward entries
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: regex }).toArray();

  console.log(`Total Rampur inward entries: ${inwards.length}`);
  console.log(`  - APPROVED: ${inwards.filter(i => i.status === 'APPROVED').length}`);
  console.log(`  - SUBMITTED: ${inwards.filter(i => i.status === 'SUBMITTED').length}`);
  console.log(`  - DRAFT: ${inwards.filter(i => i.status === 'DRAFT').length}`);

  // Build tempCode -> inward qty map
  const inwardMap = {};
  for (const inward of inwards) {
    if (inward.status === 'DRAFT') continue;
    const key = inward.tempCode;
    if (!key) continue;
    const qty = inward.packingList?.reduce((s, p) => s + (Number(p.quantity) || 0), 0) || Number(inward.invoiceQty) || 0;
    if (!inwardMap[key]) inwardMap[key] = { itemName: inward.itemName, tempCode: key, inwardQty: 0, entryCount: 0 };
    inwardMap[key].inwardQty += qty;
    inwardMap[key].entryCount++;
  }

  // Build PI tempCode -> invoice qty map
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': regex }).toArray();
  const piMap = {};
  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (!item.circle || !regex.test(item.circle)) continue;
      const key = item.tempCode;
      if (!key) continue;
      if (!piMap[key]) piMap[key] = { itemName: item.itemName, tempCode: key, invoiceQty: 0 };
      piMap[key].invoiceQty += Number(item.quantity) || 0;
    }
  }

  // Compare
  console.log(`\n=== RAMPUR: Items with Mismatch ===`);
  const keys = new Set([...Object.keys(inwardMap), ...Object.keys(piMap)]);
  let mismatches = 0;
  for (const key of [...keys].sort((a,b) => Number(a)-Number(b))) {
    const inv = piMap[key]?.invoiceQty || 0;
    const inw = inwardMap[key]?.inwardQty || 0;
    const diff = inv - inw;
    if (Math.abs(diff) >= 0.01) {
      const name = piMap[key]?.itemName || inwardMap[key]?.itemName;
      const entries = inwardMap[key]?.entryCount || 0;
      console.log(`  TempCode ${key}: ${name}`);
      console.log(`    Invoice Qty: ${inv} | Inwarded Qty: ${inw} (${entries} entries) | Diff: ${diff.toFixed(2)}`);
      mismatches++;
    }
  }
  console.log(`\nTotal mismatches: ${mismatches}`);

  process.exit(0);
}
run().catch(console.error);
