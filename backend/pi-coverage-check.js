const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const total = await mongoose.connection.collection('purchaseinvoices').countDocuments();
  
  // PIs that have at least one line item with a circle
  const withCircle = await mongoose.connection.collection('purchaseinvoices').countDocuments({
    'lineItems.circle': { $exists: true, $ne: '', $ne: null }
  });

  // PIs with NO circle on any line item
  const withoutCircle = total - withCircle;

  // Break down by circle
  const circles = ['Nahan', 'Rohru', 'Solan', 'Rampur'];
  console.log(`\n=== PURCHASE INVOICE COVERAGE ===`);
  console.log(`Total PIs in system: ${total}`);
  console.log(`PIs WITH circle mapped: ${withCircle}`);
  console.log(`PIs WITHOUT circle mapped: ${withoutCircle}`);
  console.log(`\n--- PIs per Circle ---`);

  for (const c of circles) {
    const count = await mongoose.connection.collection('purchaseinvoices').countDocuments({
      'lineItems.circle': { $regex: new RegExp(`^${c}$`, 'i') }
    });
    // Count distinct items in those PIs
    const piDocs = await mongoose.connection.collection('purchaseinvoices')
      .find({ 'lineItems.circle': { $regex: new RegExp(`^${c}$`, 'i') } }, { projection: { 'lineItems': 1 } }).toArray();
    let lineItemCount = 0;
    piDocs.forEach(pi => {
      pi.lineItems.forEach(li => {
        if (li.circle && new RegExp(`^${c}$`, 'i').test(li.circle)) lineItemCount++;
      });
    });
    console.log(`  ${c}: ${count} PIs → ${lineItemCount} line items with this circle`);
  }

  // Show sample of PI without circle
  const sample = await mongoose.connection.collection('purchaseinvoices')
    .find({ $or: [{ 'lineItems.circle': { $exists: false } }, { 'lineItems.circle': '' }] })
    .limit(3).toArray();
  console.log(`\n--- Sample PIs without circle (showing 3) ---`);
  sample.forEach(pi => {
    console.log(`  PI: ${pi.invoiceNumber} | Line items: ${pi.lineItems?.length} | Circles: [${[...new Set(pi.lineItems?.map(l => l.circle || 'BLANK'))].join(', ')}]`);
  });

  process.exit(0);
}
run().catch(console.error);
