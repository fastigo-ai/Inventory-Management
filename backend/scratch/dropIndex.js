const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('contractorassignments');
  const indexes = await collection.indexes();
  console.log('Current Indexes:', indexes);
  
  // Look for assignmentNumber_1 index and drop it
  const hasDupKey = indexes.find(i => i.name === 'assignmentNumber_1');
  if (hasDupKey) {
     console.log('Found assignmentNumber_1 index. Dropping it...');
     await collection.dropIndex('assignmentNumber_1');
     console.log('Dropped successfully.');
  } else {
     console.log('Index assignmentNumber_1 not found. Maybe it was already dropped or has a different name?');
  }
  process.exit(0);
});
