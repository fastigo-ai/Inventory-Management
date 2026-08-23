const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Check sample IR entry to find store location field
  const sample = await db.collection('storeinwardentries').findOne({ tempCode: '127' });
  console.log('Sample IR fields relevant to store:');
  console.log('  circle      :', sample?.circle);
  console.log('  subcircle   :', sample?.subcircle);
  console.log('  package     :', sample?.package);
  console.log('  act         :', sample?.act);
  console.log('  srt         :', sample?.srt);
  console.log('  inwardId    :', sample?.inwardId);
  console.log('  status      :', sample?.status);
  console.log('');

  // Get IR quantity for tempCode 127, grouped by circle (store location)
  const byCircle = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: '127', status: { $nin: ['DRAFT', 'PENDING_RECEIPT'] } } },
    { $group: {
      _id: { circle: '$circle', subcircle: '$subcircle' },
      totalQty: { $sum: { $toDouble: '$invoiceQty' } },
      entryCount: { $sum: 1 }
    }},
    { $sort: { totalQty: -1 } }
  ]).toArray();

  console.log('=== IR Done for tempCode 127 (BOLT, NUT & WASHER) — by Store/Circle ===');
  let grandTotal = 0;
  byCircle.forEach(r => {
    grandTotal += r.totalQty;
    const loc = [r._id.circle, r._id.subcircle].filter(Boolean).join(' / ');
    console.log(`  ${loc.padEnd(30)} : ${r.totalQty.toLocaleString('en-IN').padStart(15)}  (${r.entryCount} entries)`);
  });
  console.log('  ' + '─'.repeat(55));
  console.log(`  GRAND TOTAL                    : ${grandTotal.toLocaleString('en-IN').padStart(15)}`);

  // Also check pending (not yet done)
  const pending = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: '127', status: { $in: ['PENDING_RECEIPT', 'DRAFT'] } } },
    { $group: { _id: '$circle', pendingQty: { $sum: { $toDouble: '$invoiceQty' } }, count: { $sum: 1 } } },
    { $sort: { pendingQty: -1 } }
  ]).toArray();

  if (pending.length > 0) {
    console.log('');
    console.log('=== Pending IR (not yet done) by Circle ===');
    pending.forEach(r => {
      console.log(`  ${(r._id || 'N/A').padEnd(30)} : ${r.pendingQty.toLocaleString('en-IN').padStart(15)}  (${r.count} entries)`);
    });
  }

  await mongoose.disconnect();
});
