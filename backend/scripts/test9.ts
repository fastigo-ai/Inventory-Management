import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await Item.find({ "dynamicData.loaSrNo": { $in: ["2098", 2098] } });
  console.log("Items with loaSrNo 2098:", items.length);
  if (items.length > 0) {
    console.log(items[0].dynamicData);
  }
  process.exit(0);
}
run();
