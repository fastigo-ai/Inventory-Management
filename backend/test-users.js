const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.connection.collection('users');
  const Role = mongoose.connection.collection('roles');

  const pmRole = await Role.findOne({ name: 'Project Manager' });
  const pdRole = await Role.findOne({ name: 'Project Director' });

  const pms = await User.find({ role: pmRole._id }).toArray();
  const pds = await User.find({ role: pdRole._id }).toArray();

  console.log("PMs:");
  pms.forEach(u => console.log(u.email, "-", u.assignedCircle, "-", u.assignedPackage));

  console.log("PDs:");
  pds.forEach(u => console.log(u.email, "-", u.assignedCircle, "-", u.assignedPackage));

  process.exit(0);
}).catch(console.error);
