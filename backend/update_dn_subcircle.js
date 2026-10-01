require('dotenv').config();
const mongoose = require('mongoose');

async function updateDemandNotes() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const demandNotes = db.collection('demandnotes');
  
  const dnNumbers = ['DN-2609-0060', 'DN-2609-0061', 'DN-2609-0062'];
  
  const result = await demandNotes.updateMany(
    { demandNoteNumber: { $in: dnNumbers } },
    { $set: { subcircle: 'Nalagarh' } }
  );
  
  console.log(`Matched ${result.matchedCount} demand notes.`);
  console.log(`Modified ${result.modifiedCount} demand notes.`);
  
  // also verify they were updated
  const updated = await demandNotes.find({ demandNoteNumber: { $in: dnNumbers } }).toArray();
  updated.forEach(dn => {
    console.log(`- ${dn.demandNoteNumber}: ${dn.subcircle}`);
  });
  
  process.exit(0);
}

updateDemandNotes();
