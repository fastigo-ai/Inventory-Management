const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const circle = 'Solan';
  const subcircleRegex = /kumarhatti/i;

  const pending = await db.collection('storeinwardentries').find({
    circle: circle,
    subcircle: { $regex: subcircleRegex },
    status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
  }).toArray();

  console.log(`Pending receipts for Solan / Kumarhatti: ${pending.length}`);

  if (pending.length > 0) {
    console.log('Sample pending receipt:');
    console.log(JSON.stringify(pending[0], null, 2));
  } else {
    console.log('Checking all statuses for Solan / Kumarhatti:');
    const all = await db.collection('storeinwardentries').aggregate([
      { $match: { circle: circle, subcircle: { $regex: subcircleRegex } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log(all);
  }

  await mongoose.disconnect();
});
