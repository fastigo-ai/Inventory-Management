require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await mongoose.connection.collection('roles').find({ name: 'Project Manager' }).toArray();
  console.log(roles[0].accessibleModules);
  process.exit(0);
}
run();
