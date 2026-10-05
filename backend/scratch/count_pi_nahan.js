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

    // Find how many PIs have lineItems with Nahan circle
    const count = await db.collection('purchaseinvoices').countDocuments({ 
      "lineItems.circle": { $regex: /nahan/i } 
    });
    
    console.log(`Count of PIs containing Nahan circle items: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
