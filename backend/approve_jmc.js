const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const coll = db.collection('jmcregisters');
  
  const query = {
    $or: [
      { circle: { $regex: /solan/i } },
      { 'items.circle': { $regex: /solan/i } },
      { siteName: { $regex: /solan/i } }
    ],
    status: { $ne: 'Approved' } // Only update if not already Approved
  };
  
  const updateDoc = {
    $set: {
      status: 'Approved'
    }
  };
  
  const result = await coll.updateMany(query, updateDoc);
  console.log(`Approved ${result.modifiedCount} JMC records for Solan site portal.`);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
