import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const item = await Item.findOne({ "dynamicData.tempCode": { $exists: true } });
  console.log("Sample Item:");
  console.log(item?.dynamicData);
  process.exit(0);
}
run();
