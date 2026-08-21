const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function checkCircle(circle) {
  const regex = new RegExp(`^${circle}$`, 'i');

  // Get all PI line items for this circle
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': regex }).toArray();

  // Build a map: tempCode -> { itemName, invoiceQty, inwardedQty }
  const itemMap = {};

  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (!item.circle || !regex.test(item.circle)) continue;
      const key = item.tempCode || item.itemName;
      if (!itemMap[key]) {
        itemMap[key] = { itemName: item.itemName, tempCode: item.tempCode, invoiceQty: 0, inwardedQty: 0 };
      }
      itemMap[key].invoiceQty += Number(item.quantity) || 0;
    }
  }

  // Get DIs for this circle
  const dis = await mongoose.connection.collection('dis')
    .find({ $or: [{ 'lineItems.circle': regex }, { circle: regex }] }).toArray();
  const uniqueDis = new Map();
  dis.forEach(d => uniqueDis.set(d._id.toString(), d));

  for (const di of uniqueDis.values()) {
    const items = di.circle && regex.test(di.circle) ? di.lineItems
      : di.lineItems.filter(i => i.circle && regex.test(i.circle));
    for (const item of items) {
      const key = item.tempCode || item.itemName;
      if (!itemMap[key]) {
        itemMap[key] = { itemName: item.itemName, tempCode: item.tempCode, invoiceQty: 0, inwardedQty: 0 };
      }
      itemMap[key].invoiceQty += Number(item.quantity) || 0;
    }
  }

  // Now get inward entries for this circle
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ circle: regex, status: { $in: ['APPROVED', 'SUBMITTED'] } }).toArray();

  for (const inward of inwards) {
    // Sum packing list quantities
    const receivedQty = inward.packingList?.reduce((s, p) => s + (Number(p.quantity) || 0), 0) || Number(inward.invoiceQty) || 0;
    const key = inward.tempCode || inward.itemName;
    if (itemMap[key]) {
      itemMap[key].inwardedQty += receivedQty;
    }
  }

  // Print mismatches
  let mismatches = 0, matched = 0, notInwarded = 0;
  const rows = Object.values(itemMap).sort((a, b) => (a.tempCode || '').localeCompare(b.tempCode || '', undefined, { numeric: true }));

  console.log(`\n=== ${circle.toUpperCase()} CIRCLE: Invoice vs Inward Balance ===`);
  console.log(`${'TempCode'.padEnd(10)} ${'Item'.padEnd(50)} ${'Invoice Qty'.padEnd(15)} ${'Inwarded Qty'.padEnd(15)} Status`);
  console.log('-'.repeat(110));

  for (const row of rows) {
    const diff = row.invoiceQty - row.inwardedQty;
    let status;
    if (row.inwardedQty === 0) { status = '⏳ NOT INWARDED YET'; notInwarded++; }
    else if (Math.abs(diff) < 0.01) { status = '✅ MATCHED'; matched++; }
    else { status = `❌ MISMATCH (diff: ${diff.toFixed(2)})`; mismatches++; }

    console.log(`${(row.tempCode || '-').padEnd(10)} ${row.itemName.substring(0, 48).padEnd(50)} ${String(row.invoiceQty.toFixed(2)).padEnd(15)} ${String(row.inwardedQty.toFixed(2)).padEnd(15)} ${status}`);
  }

  console.log(`\nSUMMARY [${circle}]: ✅ Matched: ${matched} | ❌ Mismatch: ${mismatches} | ⏳ Not Inwarded: ${notInwarded}`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circles = ['Nahan', 'Rohru', 'Solan', 'Rampur'];
  for (const c of circles) {
    await checkCircle(c);
  }
  process.exit(0);
}
run().catch(console.error);
