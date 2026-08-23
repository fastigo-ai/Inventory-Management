const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // 1. Find PIs where tempCode 127 has decimal quantity
  const pis = await db.collection('purchaseinvoices').aggregate([
    { $unwind: "$lineItems" },
    { $match: { "lineItems.tempCode": "127" } },
    { $project: {
      invoiceNumber: 1,
      circle: "$lineItems.circle",
      quantity: "$lineItems.quantity",
      totalInventory: "$lineItems.totalInventory",
      unit: "$lineItems.unit"
    }}
  ]).toArray();

  console.log("=== PIs with decimal quantity for tempCode 127 ===");
  const decimals = pis.filter(p => {
    const qty = p.totalInventory > 0 ? p.totalInventory : p.quantity;
    return qty % 1 !== 0;
  });
  decimals.forEach(p => {
    const qty = p.totalInventory > 0 ? p.totalInventory : p.quantity;
    console.log(`PI ${p.invoiceNumber} (${p.circle}): qty=${qty}, unit=${p.unit}`);
  });
  if (decimals.length === 0) console.log('None found.');

  console.log('');

  // 2. Show unit used in each PI for tempCode 127 vs master item unit
  const item = await db.collection('items').findOne({ "dynamicData.tempCode": "127" });
  const masterUnit = item?.dynamicData?.unit;
  console.log(`=== Unit mismatch for tempCode 127 ===`);
  console.log(`Master item unit: "${masterUnit}"`);
  console.log('');

  const unitMismatches = pis.filter(p => p.unit && p.unit !== masterUnit);
  if (unitMismatches.length === 0) {
    console.log('No unit mismatches found — all PIs use the same unit as master.');
  } else {
    console.log('PIs with DIFFERENT unit than master:');
    unitMismatches.forEach(p => {
      console.log(`  PI ${p.invoiceNumber} (${p.circle}): unit="${p.unit}" (master: "${masterUnit}")`);
    });
  }

  console.log('');
  console.log('All units used across PIs for tempCode 127:');
  const units = [...new Set(pis.map(p => p.unit || 'N/A'))];
  console.log('  ', units.join(', '));

  await mongoose.disconnect();
});
