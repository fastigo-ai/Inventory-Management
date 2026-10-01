require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const itemSummaries = db.collection('itemsummaries');
  
  // Find the most recently updated item summary
  const latest = await itemSummaries.find().sort({ updatedAt: -1 }).limit(1).toArray();
  
  if (latest.length > 0) {
    console.log("Last updated ItemSummary:", latest[0].itemId, "at", latest[0].updatedAt);
  } else {
    console.log("No item summaries found.");
  }
  process.exit(0);
}
check().catch(console.error);
