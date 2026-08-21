require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  for (const u of users) {
    const role = await mongoose.connection.collection('roles').findOne({ _id: u.role });
    if (role && role.name.includes('Store')) {
      console.log(`User: ${u.email}, Role: ${role.name}, Circle: ${u.assignedCircle}, Pkg: ${u.assignedPackage}`);
    }
  }
  process.exit(0);
}
run();
