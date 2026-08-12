import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Item from './src/modules/items/item.model';

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const all = await Item.find().limit(5);
  console.log("Sample Items dynamicData:", JSON.stringify(all.map(i => i.dynamicData), null, 2));

  process.exit(0);
}
check().catch(console.error);
