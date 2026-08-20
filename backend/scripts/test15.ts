import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await mongoose.connection.db!.collection('items').find().limit(5).toArray();
  console.log("Sample items:");
  items.forEach(i => console.log(i._id, i.dynamicData));
  process.exit(0);
}
run();
