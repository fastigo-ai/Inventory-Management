require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const DemandNote = mongoose.model('DemandNote', new mongoose.Schema({}, { strict: false }));
  
  const docs = await DemandNote.find({ circle: { $regex: /^NAHAN$/i } });
  console.log(`Found ${docs.length} docs`);
  docs.forEach(d => console.log(d.demandNoteNumber, d.status, d.circle, d.package));
  process.exit(0);
}
run();
