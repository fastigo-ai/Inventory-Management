const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const pis = await db.collection('purchaseinvoices').find({ 'lineItems.tempCode': '127' }).toArray();
  const irs = await db.collection('storeinwardentries').find({ tempCode: '127' }).toArray();

  const irSumMap = {};
  for (const ir of irs) {
    if (!ir.purchaseInvoiceId) continue;
    let keyPart = ir.itemId ? ir.itemId.toString() : ir.tempCode;
    const key = `${ir.purchaseInvoiceId.toString()}_${keyPart}`;
    irSumMap[key] = (irSumMap[key] || 0) + (parseFloat(ir.invoiceQty) || 0);
  }

  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (item.tempCode !== '127') continue;
      
      const piQty = item.totalInventory > 0 ? item.totalInventory : item.quantity;
      let keyPart = item.itemId ? item.itemId.toString() : item.tempCode;
      const key = `${pi._id.toString()}_${keyPart}`;
      const existingIrQty = irSumMap[key] || 0;
      
      console.log(`PI: ${pi.invoiceNumber} | PI Qty: ${piQty} | IR Qty: ${existingIrQty}`);
    }
  }

  await mongoose.disconnect();
});
