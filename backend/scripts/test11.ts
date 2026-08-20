import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const item = await Item.findOne({ "dynamicData.loaSrNo": { $exists: true } });
  console.log("Item with loaSrNo:", item?.dynamicData);
  const item2 = await Item.findOne({ "dynamicData.loaSerialNo": { $exists: true } });
  console.log("Item with loaSerialNo:", item2?.dynamicData);
  process.exit(0);
}
run();
