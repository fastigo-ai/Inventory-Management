const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Define "today" as starting from 2026-10-03 00:00:00 local time
    const startOfToday = new Date('2026-10-03T00:00:00+05:30');

    const result = await db.collection('purchaseinvoices').deleteMany({
      "lineItems.circle": { $regex: /nahan/i },
      "createdAt": { $lt: startOfToday }
    });

    console.log(`Successfully deleted ${result.deletedCount} Purchase Invoices for Nahan that were imported before today.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
