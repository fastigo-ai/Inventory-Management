const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const invoices = await db.collection('contractorinvoices').find({ legacyMetadata: { $exists: true } }).toArray();
    
    console.log(`Found ${invoices.length} legacy invoices`);
    if(invoices.length > 0) {
      console.log("Sample legacy invoice metadata:", JSON.stringify(invoices[0].legacyMetadata, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
