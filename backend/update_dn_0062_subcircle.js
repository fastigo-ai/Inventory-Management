require('dotenv').config();
const mongoose = require('mongoose');

async function updateDemandNote() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const demandNotes = db.collection('demandnotes');
  
  const result = await demandNotes.updateOne(
    { demandNoteNumber: 'DN-2609-0062' },
    { $set: { subcircle: 'Kumarhatti' } }
  );
  
  if (result.matchedCount > 0) {
    console.log(`Successfully updated DN-2609-0062 to Kumarhatti.`);
  } else {
    console.log(`Failed to find DN-2609-0062.`);
  }
  
  process.exit(0);
}

updateDemandNote();
