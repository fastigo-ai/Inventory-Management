import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect(process.env.MONGODB_URI!).then(async () => {
  const item = await Item.findOne().lean();
  console.log(item);
  process.exit();
});
