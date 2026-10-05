const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // Delete PI
    const piResult = await db.collection('purchaseinvoices').deleteMany({ invoiceNumber: 'TEMP1' });
    console.log(`Deleted ${piResult.deletedCount} Purchase Invoices with invoiceNumber TEMP1`);
    
    // Delete IR
    const irResult = await db.collection('storeinwardentries').deleteMany({ invoiceNumber: 'TEMP1' });
    console.log(`Deleted ${irResult.deletedCount} Store Inward Entries (IR) with invoiceNumber TEMP1`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
