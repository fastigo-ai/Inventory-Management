import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Item from '../modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const items = await Item.find({ 'dynamicData.package': { $regex: /Package 1/i } }).limit(5).lean();
  console.log("Package strings in DB for Package 1:");
  items.forEach(i => console.log(`"${(i as any).dynamicData.package}"`));
  
  process.exit(0);
}
run();
