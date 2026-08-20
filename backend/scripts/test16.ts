import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await mongoose.connection.db!.collection('items').find({ "dynamicData.sku": { $in: ["2098", 2098] } }).toArray();
  console.log("Items with sku 2098:", items.length);
  if (items.length > 0) console.log(items[0].dynamicData);
  process.exit(0);
}
run();
