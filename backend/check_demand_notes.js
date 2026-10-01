require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Need to find where DemandNote is exported or just query the collection directly
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
  
  // Also let's just check how many approved demand notes exist overall
  const allApproved = await demandNotes.countDocuments({ status: { $regex: /approved/i } });
  console.log(`Total approved demand notes in DB: ${allApproved}`);

  // Let's check all notes for Nalagarh regardless of status
  const allNalagarh = await demandNotes.find({
    $or: [
      { circle: { $regex: /nalagarh/i } },
      { subcircle: { $regex: /nalagarh/i } }
    ]
  }).toArray();
  console.log(`Total demand notes for Nalagarh: ${allNalagarh.length}`);
  allNalagarh.forEach(note => {
    console.log(`- ID: ${note._id}, DN No: ${note.demandNoteNumber}, Status: ${note.status}, Subcircle: ${note.subcircle}`);
  });
  
  process.exit(0);
}
check();
