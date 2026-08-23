const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const agg = await db.collection('storeinwardentries').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();
  console.log(agg);
  mongoose.disconnect();
});
