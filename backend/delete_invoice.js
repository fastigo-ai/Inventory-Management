const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // List collections
    const collections = await db.listCollections().toArray();
    for (let col of collections) {
      if (col.name.toLowerCase().includes('billing') || col.name.toLowerCase().includes('contractor')) {
        const count = await db.collection(col.name).countDocuments({ invoiceNumber: /INV\/CB/ });
        if (count > 0) {
          console.log(`Found ${count} matching invoices in ${col.name}`);
          const res = await db.collection(col.name).deleteMany({ invoiceNumber: /INV\/CB/ });
          console.log(`Deleted ${res.deletedCount} from ${col.name}`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
run();
