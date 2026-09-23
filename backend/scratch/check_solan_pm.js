require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  const User = mongoose.connection.collection('users');
  const pms = await User.find({ assignedCircle: { $regex: /solan/i } }).toArray();
  console.log("Users in Solan:");
  console.log(pms.map(p => ({ username: p.username, name: p.name, role: p.role, circle: p.assignedCircle, package: p.assignedPackage })));
  mongoose.disconnect();
}
run();
