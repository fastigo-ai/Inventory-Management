const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const agg = await db.collection('storeinwardentries').aggregate([
    { $group: { _id: '$circle', count: { $sum: 1 } } }
  ]).toArray();
  
  console.log('Circles in IRs:', agg);

  const pendingAgg = await db.collection('storeinwardentries').aggregate([
    { $match: { status: 'PENDING_RECEIPT' } },
    { $group: { _id: '$circle', count: { $sum: 1 } } }
  ]).toArray();

  console.log('Pending Circles in IRs:', pendingAgg);
  
  m.disconnect();
});
