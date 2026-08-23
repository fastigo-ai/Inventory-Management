const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const pendingAgg = await db.collection('storeinwardentries').aggregate([
    { $match: { status: 'PENDING_RECEIPT' } },
    { $group: { _id: { circle: '$circle', subcircle: '$subcircle' }, count: { $sum: 1 } } }
  ]).toArray();

  console.log('Pending Circles/Subcircles in IRs:');
  pendingAgg.forEach(p => console.log(`${p._id.circle} - ${p._id.subcircle || 'NO SUBCIRCLE'}: ${p.count}`));
  
  mongoose.disconnect();
});
