require('dotenv').config();
const mongoose = require('mongoose');

async function checkStatus() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const entries = db.collection('storeinwardentries');

  const rampurEntries = await entries.find({ circle: { $regex: /^rampur$/i } }).toArray();
  const statusCounts = {};
  for(let entry of rampurEntries) {
    statusCounts[entry.status || 'No Status'] = (statusCounts[entry.status || 'No Status'] || 0) + 1;
  }
  
  console.log("Rampur Store Inward Statuses:", statusCounts);
  
  const solanNahanEntries = await entries.find({ circle: { $regex: /^(solan|nahan)$/i } }).toArray();
  console.log("Solan/Nahan Total:", solanNahanEntries.length);
  
  process.exit(0);
}
checkStatus().catch(console.error);
