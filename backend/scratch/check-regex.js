const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const agg = await db.collection('storeinwardentries').aggregate([
    { $match: { 'circle': 'Solan', 'subcircle': 'Kumarhatti' } },
    { $count: 'count' }
  ]).toArray();
  
  console.log('Exact Kumarhatti IR count:', agg);
  
  const query = {
    circle: { $regex: new RegExp(`^\\s*Solan\\s*$`, 'i') },
    subcircle: { $regex: new RegExp(`^\\s*Kumarhatti\\s*$`, 'i') }
  };
  
  const countWithRegex = await db.collection('storeinwardentries').countDocuments(query);
  console.log('Regex count:', countWithRegex);

  mongoose.disconnect();
});
