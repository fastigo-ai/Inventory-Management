const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  await db.collection('users').updateOne(
    { email: 'kumarhatti@gmail.com' },
    { $set: { assignedCircle: 'Solan', assignedSubcircle: 'Kumarhatti' } }
  );

  await db.collection('users').updateOne(
    { email: /nalagarh/i },
    { $set: { assignedCircle: 'Solan', assignedSubcircle: 'Nalagarh' } }
  );

  console.log('Updated user profiles for Kumarhatti and Nalagarh!');
  mongoose.disconnect();
});
