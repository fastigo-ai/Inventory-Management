require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await mongoose.connection.collection('roles').find({ name: 'Project Manager' }).toArray();
  if (!roles.length) return console.log('No PM role');
  const roleId = roles[0]._id;
  const users = await mongoose.connection.collection('users').find({ role: roleId }).toArray();
  console.log('PM Users:');
  users.forEach(u => console.log(u.email, u.assignedPackage, u.assignedCircle));
  process.exit(0);
}
run();
