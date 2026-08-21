require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const filter = {
    package: { $regex: new RegExp(`^Package 1 \\(S/N\\)$`, 'i') },
    circle: { $regex: new RegExp(`^Nahan$`, 'i') },
    status: { $in: ['Approved', 'Fulfilled'] }
  };
  console.log("Filter:", filter);
  const dns = await mongoose.connection.collection('demandnotes').find(filter).toArray();
  console.log("Found:", dns.length);
  for (const d of dns) {
    console.log(d.demandNoteNumber);
  }
  process.exit(0);
}
run();
