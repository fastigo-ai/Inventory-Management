const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/erp')
  .then(async () => {
    const db = mongoose.connection.db;
    const smRole = await db.collection('roles').findOne({ name: 'Store Manager' });
    const users = await db.collection('users').find({ role: smRole._id }).toArray();
    console.log("Store Managers:");
    users.forEach(u => {
      console.log(`- ${u.firstName} ${u.lastName} | Circle: ${u.assignedCircle} | Subcircle: ${u.assignedSubcircle}`);
    });
    process.exit();
  })
  .catch(err => console.error(err));
