const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const coll = db.collection('jmcregisters');
  
  const query = {
    $and: [
      {
        $or: [
          { circle: { $regex: /solan/i } },
          { 'items.circle': { $regex: /solan/i } },
          { siteName: { $regex: /solan/i } }
        ]
      },
      {
        $or: [
          { division: { $regex: /baddi/i } },
          { 'items.division': { $regex: /baddi/i } },
          { division: { $regex: /nalagarh/i } },
          { 'items.division': { $regex: /nalagarh/i } }
        ]
      }
    ]
  };
  
  const result = await coll.deleteMany(query);
  console.log(`Deleted ${result.deletedCount} JMC records matching Solan circle AND (Baddi OR Nalagarh) divisions.`);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
