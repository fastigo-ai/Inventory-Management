import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { SummaryService } from '../src/modules/reports/summary/summary.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Find items that have any PI in Solan circle or Rampur circle
    const circles = [/^solan$/i, /^rampur$/i, /^rohru$/i];
    const affectedItemIds = new Set<string>();

    for (const circleRegex of circles) {
      const pis = await db.collection('purchaseinvoices').find({ "lineItems.circle": { $regex: circleRegex } }).toArray();
      for (const pi of pis) {
        for (const item of pi.lineItems) {
          if (item.circle && item.circle.match(circleRegex) && item.itemId) {
            affectedItemIds.add(item.itemId.toString());
          }
        }
      }
    }

    console.log(`Found ${affectedItemIds.size} unique items in Solan/Rampur/Rohru circles to rebuild.`);

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

    console.log(`Finished rebuilding summaries for ${count} items!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
