require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const dns = await mongoose.connection.collection('demandnotes').find({}).toArray();
  for (const d of dns) {
    console.log(`DN: ${d.demandNoteNumber}, Status: ${d.status}, Circle: ${d.circle}, Pkg: ${d.package}`);
  }
  process.exit(0);
}
run();
