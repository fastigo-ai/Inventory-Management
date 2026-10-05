const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;
const { SummaryService } = require('../src/modules/reports/summary/summary.service');

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Find all items that are in the Nahan circle
    // Actually, let's just find items that have PI in Nahan circle
    const nahanRegex = /^nahan$/i;
    const pis = await db.collection('purchaseinvoices').find({ "lineItems.circle": { $regex: nahanRegex } }).toArray();
    
    const affectedItemIds = new Set();
    for (const pi of pis) {
      for (const item of pi.lineItems) {
        if (item.circle && item.circle.match(nahanRegex) && item.itemId) {
          affectedItemIds.add(item.itemId.toString());
        }
      }
    }

    console.log(`Found ${affectedItemIds.size} unique items in Nahan circle to rebuild.`);

    let count = 0;
    const itemArray = Array.from(affectedItemIds);
    for (const itemId of itemArray) {
      try {
        await SummaryService.rebuildForItem(itemId);
        count++;
        if (count % 10 === 0) console.log(`Rebuilt ${count}/${itemArray.length} items...`);
      } catch (err) {
        console.error(`Error rebuilding item ${itemId}:`, err);
      }
    }

    console.log(`Finished rebuilding summaries for ${count} Nahan items!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
