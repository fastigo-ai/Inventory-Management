require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await mongoose.connection.collection('roles').find({ name: 'Project Director' }).toArray();
  if (roles.length > 0) {
    console.log(roles[0].permissions);
  }
  process.exit(0);
}
run();
