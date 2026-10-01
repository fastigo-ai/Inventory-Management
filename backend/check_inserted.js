require('dotenv').config();
const mongoose = require('mongoose');

async function checkInserted() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const entries = db.collection('storeinwardentries');

  const rampurEntry = await entries.findOne({ circle: { $regex: /^rampur$/i } });
  console.log("Newly Inserted Entry:", JSON.stringify(rampurEntry, null, 2));

  process.exit(0);
}
checkInserted().catch(console.error);
