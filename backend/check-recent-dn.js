require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const DemandNote = mongoose.model('DemandNote', new mongoose.Schema({}, { strict: false }));
  
  const docs = await DemandNote.find().sort({ _id: -1 }).limit(3);
  console.log(`Most recent 3 docs:`);
  docs.forEach(d => console.log(d.demandNoteNumber, d.status, d.circle, d.package, 'createdAt:', d.createdAt));
  process.exit(0);
}
run();
