import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await Item.find({ _id: "6a7426d44457b533373dd7f3" });
  console.log("Found Item:", items.length > 0 ? items[0].dynamicData : "Not found");
  process.exit(0);
}
run();
