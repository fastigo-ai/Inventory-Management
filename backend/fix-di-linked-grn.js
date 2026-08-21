const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circle = 'Nahan';
  const regex = new RegExp(`^${circle}$`, 'i');
  const tempCode = '101';
  const diNumbers = ['26363-96', '5936-50', '16170-206', '25988-26023', '26332-62'];

  console.log("=== FINDING PIs LINKED TO THESE DIs FOR TempCode 101 ===\n");

  for (const diNum of diNumbers) {
    console.log(`\n--- DI: ${diNum} ---`);

    // Find PI that references this DI
    const linkedPIs = await mongoose.connection.collection('purchaseinvoices').find({
      $or: [
        { diNumber: diNum },
        { diRefNo: diNum },
        { 'lineItems.diRefNo': diNum },
        { diId: diNum }
      ]
    }).toArray();

    // Also find inward entries that reference this DI to see what PIs they use
    const linkedInwards = await mongoose.connection.collection('storeinwardentries').find({
      $or: [{ diRefNo: diNum }]
    }).toArray();
    
    const piIdsFromInwards = [...new Set(linkedInwards.map(i => i.purchaseInvoiceId?.toString()).filter(Boolean))];
    let piFromInwards = [];
    if (piIdsFromInwards.length > 0) {
      piFromInwards = await mongoose.connection.collection('purchaseinvoices').find({
        _id: { $in: piIdsFromInwards.map(id => new mongoose.Types.ObjectId(id)) }
      }).toArray();
    }

    const allPIs = [...linkedPIs, ...piFromInwards];
    const uniquePIs = new Map();
    allPIs.forEach(p => uniquePIs.set(p._id.toString(), p));

    if (uniquePIs.size === 0) {
      console.log(`  ⚠️ No PIs found linked to this DI`);
      // Show DI details
      const di = await mongoose.connection.collection('dis').findOne({ diNumber: diNum });
      if (di) {
        const items = di.lineItems.filter(i => i.tempCode === tempCode);
        items.forEach(i => console.log(`  DI Item: TempCode ${i.tempCode} | Qty: ${i.quantity} | Circle: ${i.circle || di.circle}`));
      }
      continue;
    }

    for (const pi of uniquePIs.values()) {
      const items = pi.lineItems.filter(i => i.tempCode === tempCode && i.circle && regex.test(i.circle));
      if (items.length === 0) {
        console.log(`  PI ${pi.invoiceNumber}: No TempCode 101 with Nahan circle`);
        continue;
      }

      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        const exists = await mongoose.connection.collection('storeinwardentries').countDocuments({
          purchaseInvoiceId: pi._id,
          tempCode,
          diRefNo: diNum,
          circle: regex,
          status: { $in: ['APPROVED', 'SUBMITTED'] }
        });

        if (exists > 0) {
          console.log(`  ✅ PI ${pi.invoiceNumber}: Already has GRN for DI ${diNum} | Qty: ${qty}`);
          continue;
        }

        console.log(`  ❌ PI ${pi.invoiceNumber}: MISSING GRN for DI ${diNum} | Qty: ${qty} → Creating...`);
        await mongoose.connection.collection('storeinwardentries').insertOne({
          inwardId: `INW-DI-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          purchaseInvoiceId: pi._id,
          diRefNo: diNum,
          circle,
          tempCode,
          itemName: item.itemName,
          invoiceQty: qty,
          receivedQty: qty,
          rejectedQty: 0,
          packingList: [{ description: item.itemName, quantity: qty }],
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`     ✅ GRN Created!`);
      }
    }
  }

  // Final total
  const allInwards = await mongoose.connection.collection('storeinwardentries')
    .find({ tempCode, circle: regex, status: { $in: ['APPROVED', 'SUBMITTED'] } }).toArray();
  const totalQty = allInwards.reduce((s, i) => s + (i.packingList?.reduce((ps, p) => ps + (Number(p.quantity) || 0), 0) || Number(i.invoiceQty) || 0), 0);
  console.log(`\n=== UPDATED TOTAL INWARDED FOR TempCode 101 (Nahan): ${totalQty} ===`);

  process.exit(0);
}
run().catch(console.error);
