import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Item from '../src/modules/items/item.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const pkg = 'Package 1 (S/N)';
  const itemQuery: any = { isDeleted: false };
  if (pkg) itemQuery['dynamicData.package'] = pkg;
  
  const allItems = await Item.find(itemQuery).lean();
  console.log("Total items found with space:", allItems.length);

  const itemQuery2: any = { isDeleted: false };
  itemQuery2['dynamicData.package'] = 'Package 1(S/N)';
  const allItems2 = await Item.find(itemQuery2).lean();
  console.log("Total items found without space:", allItems2.length);

  process.exit(0);
}
run();
