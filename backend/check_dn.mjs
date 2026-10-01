import 'dotenv/config';
import mongoose from 'mongoose';

async function check() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI found in env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const demandNotes = db.collection('demandnotes');
  
  const nalagarhNotes = await demandNotes.find({
    $or: [
      { circle: { $regex: /nalagarh/i } },
      { subcircle: { $regex: /nalagarh/i } },
      { "lineItems.circle": { $regex: /nalagarh/i } },
      { "lineItems.subcircle": { $regex: /nalagarh/i } }
    ],
    status: { $regex: /approved/i }
  }).toArray();
  
  console.log(`Found ${nalagarhNotes.length} approved demand notes for Nalagarh`);
  
  nalagarhNotes.forEach(note => {
    console.log(`- ID: ${note._id}, DN No: ${note.demandNoteNumber}, Status: ${note.status}, Circle: ${note.circle}, Subcircle: ${note.subcircle}`);
  });
  
  const allNalagarh = await demandNotes.find({
    $or: [
      { circle: { $regex: /nalagarh/i } },
      { subcircle: { $regex: /nalagarh/i } },
      { "lineItems.circle": { $regex: /nalagarh/i } },
      { "lineItems.subcircle": { $regex: /nalagarh/i } }
    ]
  }).toArray();
  console.log(`\nTotal demand notes for Nalagarh (any status): ${allNalagarh.length}`);
  allNalagarh.forEach(note => {
    console.log(`- ID: ${note._id}, DN No: ${note.demandNoteNumber}, Status: ${note.status}, Circle: ${note.circle}, Subcircle: ${note.subcircle}`);
  });
  
  process.exit(0);
}
check();
