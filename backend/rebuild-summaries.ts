import mongoose from 'mongoose';
import { SummaryService } from './src/modules/reports/summary/summary.service';
import Item from './src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to remote DB');
  
  // Find all items and rebuild summary
  const items = await Item.find({ isDeleted: { $ne: true } }).select('_id');
  console.log(`Found ${items.length} items to rebuild`);
  
  let count = 0;
  for (const item of items) {
    try {
      await SummaryService.rebuildForItem(item._id.toString());
      count++;
      if (count % 100 === 0) console.log(`Rebuilt ${count} items...`);
    } catch (err) {
      console.error(`Error rebuilding item ${item._id}:`, err);
    }
  }
  
  console.log(`Successfully rebuilt summaries for ${count} items.`);
  process.exit(0);
}

run().catch(console.error);
