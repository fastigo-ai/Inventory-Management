const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // PI quantity for tempCode 101
  const pi = await db.collection('purchaseinvoices').aggregate([
    { $unwind: "$lineItems" },
    { $match: { "lineItems.tempCode": "101" } },
    { $group: { _id: null, total: { $sum: { $toDouble: "$lineItems.quantity" } }, count: { $sum: 1 } } }
  ]).toArray();

  // IR entries for tempCode 101 - grouped by status
  const ir = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: "101" } },
    { $group: { _id: "$status", total: { $sum: { $toDouble: "$invoiceQty" } }, count: { $sum: 1 } } }
  ]).toArray();

  // Check if IR entries have invoiceQty vs totalQty differences
  const sample = await db.collection('storeinwardentries').findOne({ tempCode: "101" });

  console.log('PI for tempCode 101:', JSON.stringify(pi, null, 2));
  console.log('\nIR by status for tempCode 101:', JSON.stringify(ir, null, 2));
  console.log('\nSample IR entry fields:', JSON.stringify({ invoiceQty: sample?.invoiceQty, totalQty: sample?.totalQty, status: sample?.status, invoiceNumber: sample?.invoiceNumber }, null, 2));

  // Check if there are duplicate/orphaned IR entries (same PI linked multiple times)
  const duplicates = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: "101" } },
    { $group: { _id: { piId: "$purchaseInvoiceId", lineItem: "$tempCode" }, count: { $sum: 1 }, total: { $sum: { $toDouble: "$invoiceQty" } } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 5 }
  ]).toArray();
  
  console.log('\nDuplicate IR entries for tempCode 101:', JSON.stringify(duplicates, null, 2));

  mongoose.disconnect();
});
