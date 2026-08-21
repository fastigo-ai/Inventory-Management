require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const dn = await mongoose.connection.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2608-0001' });
  console.log(JSON.stringify(dn));
  process.exit(0);
}
run();
