const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const coll = db.collection('jmcregisters');
  
  const query = {
    $or: [
      { circle: { $regex: /solan/i } },
      { division: { $regex: /baddi/i } },
      { 'items.circle': { $regex: /solan/i } },
      { 'items.division': { $regex: /baddi/i } },
      { siteName: { $regex: /solan/i } }
    ]
  };
  
  const result = await coll.deleteMany(query);
  console.log(`Deleted ${result.deletedCount} JMC records matching Solan / Baddi.`);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
