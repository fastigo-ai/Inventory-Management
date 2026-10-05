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
    // Server time is likely UTC, so let's use an exact string or Date object
    const startOfToday = new Date('2026-10-03T00:00:00+05:30');

    const totalNahanPIs = await db.collection('purchaseinvoices').countDocuments({
      "lineItems.circle": { $regex: /nahan/i }
    });

    const oldNahanPIs = await db.collection('purchaseinvoices').countDocuments({
      "lineItems.circle": { $regex: /nahan/i },
      "createdAt": { $lt: startOfToday }
    });

    const todayNahanPIs = await db.collection('purchaseinvoices').countDocuments({
      "lineItems.circle": { $regex: /nahan/i },
      "createdAt": { $gte: startOfToday }
    });

    console.log(`Total Nahan PIs: ${totalNahanPIs}`);
    console.log(`Nahan PIs created before today: ${oldNahanPIs}`);
    console.log(`Nahan PIs created today: ${todayNahanPIs}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
