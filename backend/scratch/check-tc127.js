const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const res = await db.collection('purchaseinvoices').aggregate([
    { $unwind: "$lineItems" },
    { $match: { "lineItems.tempCode": "127" } },
    { $group: {
      _id: "$_id",
      invoiceNumber: { $first: "$invoiceNumber" },
      circle: { $first: "$lineItems.circle" },
      qty: { $sum: { $toDouble: {
        $cond: [
          { $gt: [{ $ifNull: ["$lineItems.totalInventory", 0] }, 0] },
          "$lineItems.totalInventory",
          "$lineItems.quantity"
        ]
      }}}
    }},
    { $sort: { qty: -1 } }
  ]).toArray();

  let total = 0;
  res.forEach(r => {
    total += r.qty;
    console.log(`PI ${r.invoiceNumber} (${r.circle || 'N/A'}): ${r.qty.toLocaleString('en-IN')}`);
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Total across all PIs:', total.toLocaleString('en-IN'));
  console.log('Number of PIs      :', res.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Also check what item tempCode 127 is
  const item = await db.collection('items').findOne({ "dynamicData.tempCode": "127" });
  console.log('Item name:', item?.dynamicData?.name);
  console.log('Item circle:', item?.dynamicData?.circle);
  console.log('LOA Quantity:', item?.dynamicData?.loaQuantity);

  await mongoose.disconnect();
});
