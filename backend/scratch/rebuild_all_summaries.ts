import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });
import mongoose from 'mongoose';
import { SummaryService } from '../src/modules/reports/summary/summary.service';
import Item from '../src/modules/items/item.model';

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to MongoDB');

  const items = await Item.find({ isDeleted: false }, '_id').lean();
  console.log(`Found ${items.length} items to rebuild.`);

  let i = 0;
  for (const item of items) {
    try {
      await SummaryService.rebuildForItem(item._id.toString());
      i++;
      if (i % 50 === 0) console.log(`Rebuilt ${i}/${items.length} items...`);
    } catch (e) {
      console.error(`Failed on item ${item._id}:`, e);
    }
  }

  console.log('Finished rebuilding all item summaries.');
  process.exit(0);
}

main().catch(console.error);
