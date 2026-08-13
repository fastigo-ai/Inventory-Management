import 'dotenv/config';
import connectDB from './src/core/database';
import Item from './src/modules/items/item.model';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const doc = await Item.find().limit(2).lean();
  console.log(JSON.stringify(doc, null, 2));
  mongoose.connection.close();
}
run();
