require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const modules = await mongoose.connection.collection('modules').find().toArray();
  console.log(modules.map(m => m.name));
  process.exit(0);
}
run();
