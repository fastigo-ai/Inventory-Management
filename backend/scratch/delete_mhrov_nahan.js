const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const db = mongoose.connection.db;

    const count = await db.collection('mhrovs').countDocuments({ circle: { $regex: /nahan/i } });
    console.log(`Count of MHROV records in Nahan circle: ${count}`);

    if (count > 0) {
      const deleteRes = await db.collection('mhrovs').deleteMany({ circle: { $regex: /nahan/i } });
      console.log(`Deleted ${deleteRes.deletedCount} MHROV records for Nahan.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
