const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  console.log('Deleting all StoreInwardEntries...');
  const irRes = await db.collection('storeinwardentries').deleteMany({});
  console.log(`Deleted ${irRes.deletedCount} IRs.`);

  console.log('Deleting all PurchaseInvoices...');
  const piRes = await db.collection('purchaseinvoices').deleteMany({});
  console.log(`Deleted ${piRes.deletedCount} PIs.`);

  await mongoose.disconnect();
});
