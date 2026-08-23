const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // 1. Matrix way (aggregating across whole collection)
  const piAgg = await db.collection('purchaseinvoices').aggregate([
    { $unwind: "$lineItems" },
    { $match: { "lineItems.tempCode": "127" } },
    { $group: {
        _id: null,
        piQuantity: {
          $sum: {
            $toDouble: {
              $cond: [
                { $gt: [{ $ifNull: ["$lineItems.totalInventory", 0] }, 0] },
                "$lineItems.totalInventory",
                "$lineItems.quantity"
              ]
            }
          }
        }
      }
    }
  ]).toArray();
  
  const irAgg = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: "127", status: { $nin: ["DRAFT", "PENDING_RECEIPT"] } } },
    { $group: { _id: null, irQuantity: { $sum: { $toDouble: "$invoiceQty" } } } }
  ]).toArray();

  console.log('--- Matrix Calculation for 127 ---');
  const matrixPi = piAgg[0]?.piQuantity || 0;
  const matrixIr = irAgg[0]?.irQuantity || 0;
  console.log(`PI Qty: ${matrixPi}`);
  console.log(`IR Qty: ${matrixIr}`);
  console.log(`Pending: ${matrixPi - matrixIr}`);

  // 2. My script way
  console.log('\n--- Script Calculation for 127 ---');
  const pis = await db.collection('purchaseinvoices').find({ 'lineItems.tempCode': '127' }).toArray();
  const irs = await db.collection('storeinwardentries').find({ tempCode: '127' }).toArray();

  const irSumMap = {};
  for (const ir of irs) {
    if (!ir.purchaseInvoiceId) continue;
    let keyPart = ir.itemId ? ir.itemId.toString() : ir.tempCode;
    const key = `${ir.purchaseInvoiceId.toString()}_${keyPart}`;
    irSumMap[key] = (irSumMap[key] || 0) + (parseFloat(ir.invoiceQty) || 0);
  }

  let scriptMissing = 0;
  let scriptPiSum = 0;
  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (item.tempCode !== '127') continue;
      
      const piQty = item.totalInventory > 0 ? item.totalInventory : item.quantity;
      scriptPiSum += piQty;
      
      let keyPart = item.itemId ? item.itemId.toString() : item.tempCode;
      const key = `${pi._id.toString()}_${keyPart}`;
      const existingIrQty = irSumMap[key] || 0;
      
      const missingQty = piQty - existingIrQty;
      if (missingQty > 0.1) {
        scriptMissing += missingQty;
      }
    }
  }

  console.log(`Script PI Qty Sum: ${scriptPiSum}`);
  console.log(`Script Generated Missing: ${scriptMissing}`);

  await mongoose.disconnect();
});
