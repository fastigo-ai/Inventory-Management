const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const circle = 'Nahan';

  const pending = await db.collection('storeinwardentries').find({
    circle: circle,
    status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
  }).toArray();

  console.log(`Pending receipts for ${circle}: ${pending.length}`);

  if (pending.length > 0) {
    console.log('Sample pending receipt:');
    console.log(JSON.stringify(pending[0], null, 2));
  } else {
    console.log('Checking all statuses for Nahan:');
    const all = await db.collection('storeinwardentries').aggregate([
      { $match: { circle: circle } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log(all);
  }

  await mongoose.disconnect();
});
