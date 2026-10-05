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

    // Delete the 11 PIs that have lineItems with Nahan circle
    const deleteRes = await db.collection('purchaseinvoices').deleteMany({ 
      "lineItems.circle": { $regex: /nahan/i } 
    });
    
    console.log(`Successfully deleted ${deleteRes.deletedCount} Purchase Invoices for Nahan.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
