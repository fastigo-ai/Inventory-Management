const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const user = await db.collection('users').aggregate([
    { $match: { email: 'kumarhatti@gmail.com' } },
    { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'roleDoc' } }
  ]).toArray();

  if (user[0] && user[0].roleDoc.length > 0) {
    console.log('Kumarhatti User Role:', user[0].roleDoc[0].name);
    console.log('Permissions:', user[0].roleDoc[0].permissions);
  } else {
    console.log('Role not found');
  }
  
  mongoose.disconnect();
});
