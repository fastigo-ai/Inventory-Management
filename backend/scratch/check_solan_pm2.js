require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  const Role = mongoose.connection.collection('roles');
  const pmRole = await Role.findOne({ name: { $regex: /pm/i } });
  
  const User = mongoose.connection.collection('users');
  const pms = await User.find({ assignedCircle: { $regex: /solan/i } }).toArray();
  
  // also fetch the role names for these users
  const roleIds = pms.map(p => p.role).filter(Boolean);
  const roles = await Role.find({ _id: { $in: roleIds } }).toArray();
  const roleMap = {};
  roles.forEach(r => roleMap[r._id.toString()] = r.name);
  
  console.log("Users in Solan:");
  pms.forEach(p => {
    console.log(`- Email/Username: ${p.email || p.username || JSON.stringify(p)} | Role: ${roleMap[p.role?.toString()] || p.role}`);
  });
  mongoose.disconnect();
}
run();
