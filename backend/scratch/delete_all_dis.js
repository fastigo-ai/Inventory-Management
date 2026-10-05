require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllDIs() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const disColl = db.collection('dis');
  
  const result = await disColl.deleteMany({});
  
  console.log(`Successfully deleted ${result.deletedCount} DIs from the database.`);
  
  mongoose.disconnect();
}

deleteAllDIs().catch(console.error);
