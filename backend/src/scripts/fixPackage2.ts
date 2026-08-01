import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Item from '../modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const result = await Item.updateMany(
    { 'dynamicData.package': 'Package 2 (R/R)' },
    { $set: { 'dynamicData.package': 'Package 2(R/R)' } }
  );
  
  console.log(`Updated ${result.modifiedCount} items from "Package 2 (R/R)" to "Package 2(R/R)"`);

  process.exit(0);
}

run();
