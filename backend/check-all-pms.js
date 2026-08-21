require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await mongoose.connection.collection('roles').find({ name: 'Project Manager' }).toArray();
  const roleId = roles[0]._id;
  const users = await mongoose.connection.collection('users').find({ role: roleId }).toArray();
  users.forEach(u => console.log(JSON.stringify({email: u.email, pkg: u.assignedPackage, circle: u.assignedCircle})));
  process.exit(0);
}
run();
