import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Item from '../modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await Item.find({'dynamicData.activity': { $exists: true, $ne: '' }}).limit(5).lean();
  console.log("Items with activity:", items.map((i: any) => i.dynamicData.activity));
  
  const allActs = await Item.distinct('dynamicData.activity');
  console.log("All unique activities:", allActs);
  process.exit(0);
}
run();
