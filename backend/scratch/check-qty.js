const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const piAgg = await db.collection('purchaseinvoices').aggregate([
    { $unwind: '$lineItems' },
    { $match: { 'lineItems.tempCode': '127' } },
    { $group: { 
        _id: null, 
        totalInventory: { $sum: '$lineItems.totalInventory' }, 
        quantity: { $sum: '$lineItems.quantity' }, 
        count: { $sum: 1 } 
    }}
  ]).toArray();
  
  const irAgg = await db.collection('storeinwardentries').aggregate([
    { $match: { tempCode: '127' } },
    { $group: { 
        _id: null, 
        invoiceQty: { $sum: '$invoiceQty' }, 
        totalQty: { $sum: '$totalQty' } 
    }}
  ]).toArray();
  
  console.log('PI:', piAgg);
  console.log('IR:', irAgg);
  mongoose.disconnect();
});
