require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const itemSummaries = db.collection('itemsummaries');
  
  // Count how many item summaries have been updated recently
  const updatedSince = new Date(Date.now() - 5 * 60 * 1000); // last 5 minutes
  const recentCount = await itemSummaries.countDocuments({ updatedAt: { $gte: updatedSince } });
  
  console.log("Item summaries updated in the last 5 minutes:", recentCount);
  process.exit(0);
}
check().catch(console.error);
