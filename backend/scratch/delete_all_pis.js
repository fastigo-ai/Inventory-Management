require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllPIs() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const pisColl = db.collection('purchaseinvoices');
  
  const result = await pisColl.deleteMany({});
  
  console.log(`Successfully deleted ${result.deletedCount} PIs from the database.`);
  
  mongoose.disconnect();
}

deleteAllPIs().catch(console.error);
