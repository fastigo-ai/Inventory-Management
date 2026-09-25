const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const coll = db.collection('jmcregisters'); // or whatever the collection name is
  
  const query = {
    $or: [
      { circle: { $regex: /solan/i } },
      { division: { $regex: /baddi/i } },
      { 'items.circle': { $regex: /solan/i } },
      { 'items.division': { $regex: /baddi/i } },
      { siteName: { $regex: /solan/i } }
    ]
  };
  
  const docs = await coll.find(query).toArray();
  console.log(`Found ${docs.length} matching JMC records.`);
  
  docs.forEach(d => {
    console.log(`- ID: ${d._id}, Circle: ${d.circle}, Division: ${d.division}, JMC No: ${d.jmcNumber || d.jmcNo}, Status: ${d.status}`);
  });
  
  // If the user said "delete the jmc in solan site portal of the baddi division"
  // Maybe I should just delete them after confirming.
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
