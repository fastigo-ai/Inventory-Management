const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const roles = await mongoose.connection.collection('roles').find({}).toArray();
  console.log("Roles:");
  roles.forEach(r => console.log(r.name));
  console.log("Users:");
  users.forEach(u => console.log(`${u.email}: Role ID ${u.role}`));
  process.exit(0);
});
