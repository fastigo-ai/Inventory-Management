const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function auditAndFix(circle) {
  const regex = new RegExp(`^${circle}$`, 'i');
  let missing = 0, inwarded = 0, fixed = 0;

  // --- PIs ---
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': regex }).toArray();

  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (!item.circle || !regex.test(item.circle)) continue;
      const correct = await mongoose.connection.collection('storeinwardentries')
        .countDocuments({ purchaseInvoiceId: pi._id, itemName: item.itemName, circle: regex });
      if (correct > 0) { inwarded++; continue; }

      // Fix: move wrong-circle inwards
      const wrongOnes = await mongoose.connection.collection('storeinwardentries')
        .find({ purchaseInvoiceId: pi._id, itemName: item.itemName, circle: { $not: regex } }).toArray();
      if (wrongOnes.length > 0) {
        await mongoose.connection.collection('storeinwardentries')
          .updateMany({ _id: { $in: wrongOnes.map(w => w._id) } }, { $set: { circle } });
        fixed += wrongOnes.length;
      } else {
        missing++;
      }
    }
  }

  // --- DIs ---
  const dis = await mongoose.connection.collection('dis')
    .find({ $or: [{ 'lineItems.circle': regex }, { circle: regex }] }).toArray();

  const uniqueDis = new Map();
  dis.forEach(d => uniqueDis.set(d._id.toString(), d));

  for (const di of uniqueDis.values()) {
    const items = di.circle && regex.test(di.circle) ? di.lineItems
      : di.lineItems.filter(i => i.circle && regex.test(i.circle));

    for (const item of items) {
      const correct = await mongoose.connection.collection('storeinwardentries').countDocuments({
        $or: [{ diId: di._id }, { diRefNo: di.diNumber }],
        tempCode: item.tempCode, circle: regex
      });
      if (correct > 0) { inwarded++; continue; }

      const wrongOnes = await mongoose.connection.collection('storeinwardentries').find({
        $or: [{ diId: di._id }, { diRefNo: di.diNumber }],
        tempCode: item.tempCode, circle: { $not: regex }
      }).toArray();
      if (wrongOnes.length > 0) {
        await mongoose.connection.collection('storeinwardentries')
          .updateMany({ _id: { $in: wrongOnes.map(w => w._id) } }, { $set: { circle } });
        fixed += wrongOnes.length;
      } else {
        missing++;
      }
    }
  }

  console.log(`[${circle.toUpperCase().padEnd(12)}] ✅ Correctly Inwarded: ${inwarded} | 🔧 Fixed (Mis-assigned): ${fixed} | ⏳ Pending (Not Inwarded Yet): ${missing}`);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("=== ALL-CIRCLE AUDIT & AUTO-FIX ===\n");

  const circles = ['Nahan', 'Rohru', 'Solan', 'Rampur'];
  for (const c of circles) {
    await auditAndFix(c);
  }

  console.log("\n✅ DONE. All circles audited and fixed.");
  process.exit(0);
}
run().catch(console.error);
