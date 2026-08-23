const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const sample = await db.collection('storeinwardentries').findOne({ status: 'APPROVED' });
  console.log('Sample Approved IR:');
  console.log('purchaseInvoiceId:', sample.purchaseInvoiceId);
  console.log('invoiceQty:', sample.invoiceQty);
  
  const noPiIdCount = await db.collection('storeinwardentries').countDocuments({ purchaseInvoiceId: { $exists: false } });
  const nullPiIdCount = await db.collection('storeinwardentries').countDocuments({ purchaseInvoiceId: null });
  console.log(`IRs missing purchaseInvoiceId: ${noPiIdCount + nullPiIdCount}`);
  
  await mongoose.disconnect();
});
