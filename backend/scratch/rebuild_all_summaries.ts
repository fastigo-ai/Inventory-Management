import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';
import { SummaryService } from '../src/modules/reports/summary/summary.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database.');

    const items = await Item.find({ isDeleted: { $ne: true } });
    console.log(`Found ${items.length} items to rebuild.`);

    let count = 0;
    for (const item of items) {
      try {
        await SummaryService.rebuildForItem(item._id.toString());
      } catch (e) {
        // ignore
      }
      count++;
      if (count % 50 === 0) {
        console.log(`Rebuilt ${count}/${items.length} items...`);
      }
    }

    console.log('Finished rebuilding all item summaries.');
    process.exit(0);
  } catch (err) {
    console.error('Error rebuilding summaries:', err);
    process.exit(1);
  }
}

run();
